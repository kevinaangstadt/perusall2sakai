// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );


    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;


    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){

        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[ 1 ];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){

            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push( [] );

        }

        var strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[ 2 ]){

            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );

        } else {

            // We found a non-quoted value.
            strMatchedValue = arrMatches[ 3 ];

        }


        // Now that we have our value string, let's add
        // it to the data array.
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }

    // Return the parsed data.
    return( arrData );
}

function parsePerusall(data) {
    const csv = CSVToArray(data);
    if (csv.length < 2) {
        throw "CSV needs at least two lines of data";
    }

    const header = csv[0];
    if (header[0] !== "Name" && header[1] !== "Student ID" && header[2] !== "Email" && header[3] !== "Average score") {
        throw `Unrecognized format. The initial header items were ${header.slice(0,4)}`
    }

    const assignments = header.slice(4);

    const gradeData = csv.slice(1).filter(function(item) { return item.length === header.length }).map(function(item){
        const email = item[2];
        const id = email.substring(0, email.lastIndexOf("@"));
        let data = {
            id: id,
            email: email,
            name: item[0]
        }

        for (let i = 4; i < header.length; i++) {
            data[header[i]] = parseFloat(item[i]) || 0;
        }

        return data;
    });

    return {
        assignments: assignments,
        grades: gradeData
    };
}

function generateAssignments(assignments, grades) {
    const container = document.getElementById('output');

    // instructions
    const instructions = document.createElement('p');
    instructions.innerHTML = `
        Select the assignments you wish to convert and enter the max score for each.
        Note that you can also enter the same max score using the box in the header.
    `;
    container.appendChild(instructions);

    // assignments
    const assignmentsDiv = document.createElement('div');

    const template = document.getElementById('assignment-template');


    // all check boxes
    assignments.forEach(function(a, id) {
        const clone = template.content.cloneNode(true);

        const check = clone.querySelector('.checkbox')
        check.id = `assignment-${id}`;

        const label = clone.querySelector('label');
        label.for = `assignment-${id}`;
        label.innerText = a;

        const score = clone.querySelector('.score')
        score.value = Math.max(... grades.map(function(e){return e[a];}));

        // set up sore
        check.addEventListener("change", function() {
            score.disabled = !check.checked;
        });

        assignmentsDiv.appendChild(clone);

    });

    // make "check all"
    const checkAll = template.content.cloneNode(true);
    checkAll.firstElementChild.classList.add("border-bottom");
    checkAll.firstElementChild.classList.add("pb-3");
    const box = checkAll.querySelector('.checkbox');
    box.id = `assignment-select-all`;

    const label = checkAll.querySelector('label');
    label.for = `assignment-elect-all`;
    label.innerText = "Select All";

    allScore = checkAll.querySelector('.score');
    allScore.disabled = false;
    allScore.placeholder = "Max Score";

    // Todo check for valid numbers
    allScore.addEventListener("input", function(){
        const val = allScore.value;
        assignmentsDiv.querySelectorAll('.score').forEach(function(e){ e.value = val; });
    });

    assignmentsDiv.querySelectorAll('.score').forEach(function(e){
        e.addEventListener("input", function(){
            allScore.value = "";
        });
    });

    box.addEventListener("change", function() {
        assignmentsDiv.querySelectorAll('.checkbox').forEach(function(i){
            i.checked = box.checked;
        });
    });

    assignmentsDiv.querySelectorAll('.checkbox').forEach(function(i){
        i.addEventListener("change", function() {
            const nodes = Array.from(assignmentsDiv.querySelectorAll('.checkbox'));
            // check to see if all checked or all not checked
            if (nodes.every(function(el){return el.checked})) {
                box.checked = true;
                box.indeterminate = false;
            } else if (nodes.every(function(el){return !el.checked})) {
                box.checked = false;
                box.indeterminate = false;
            } else {
                box.indeterminate = true;
            }
        })
    });

    container.appendChild(checkAll);
    container.appendChild(assignmentsDiv);

    // add a submit button
    const submit = document.createElement('a');
    submit.classList.add("btn");
    submit.classList.add("btn-primary")
    submit.innerText = "Generate Gradescope Grades"

    submit.addEventListener("click", function() {
        // get all things checked
        const assignmentsToConvert = Array.from(assignmentsDiv.children).filter(function(e) {
            return e.querySelector('.checkbox').checked;
        });

        const assignments = assignmentsToConvert.map(function(node) {
            return {
                name: node.querySelector('label').innerText,
                total: parseFloat(node.querySelector('.score').value)
            }
        });

        const fourPoint = document.querySelector('#useFourPoint').checked;

        const data = generateGradescopeCSV(assignments, grades, fourPoint);

        var downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', 'data:application/octet-stream,' + encodeURIComponent(data));
        downloadLink.setAttribute('download', `Perusall_Grades_${new Date().toISOString()}.csv`);

        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);

        downloadLink.click();

        document.body.removeChild(downloadLink);
    })

    container.appendChild(submit);

}

function generateGradescopeCSV(assignments, grades, fourPoint=false) {

    // make the header
    const sk_assignments = assignments.map(function(a) {
        if (fourPoint){
            // point value will always be 4 in this case
            return `"${a.name}[4]"`;
        } else {
            return `"${a.name}[${a.total}]"`;
        }
    })
    const header = `"Student ID","Name",${sk_assignments.join()}`;

    // make the grades
    const entries = grades.map(function(grade) {
        const grades = assignments.map(function(a) {
            const raw = grade[a.name];

            if (fourPoint) {
                const percent = raw / a.total;
                // round to nearest quarter
                return `"${(Math.round(percent * 4 * 4) / 4).toFixed(2)}"`;
            } else {
                return `"${raw}"`;
            } 
        });

        return `"${grade.id}","${grade.name}",${grades.join()}`;
    });

    return `${header}\n${entries.join("\n")}`;
}

window.onload = function() {

    const inputElement = document.getElementById("formFile");
    inputElement.addEventListener("change", async function() {
        const grades = parsePerusall(await inputElement.files[0].text());
        generateAssignments(grades.assignments, grades.grades);

        // reset file
        // TODO remove
        document.getElementById("perusallForm").reset();
    });
}

