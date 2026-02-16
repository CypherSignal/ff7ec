// python -m http.server

/* Trash code - Need to clean up and add comments and stuff*/
/* When the user clicks on the button, toggle between hiding and showing the dropdown content */

const FILE_NAME = 'weaponData-Staging.tsv'
const ELEM_TABL_COL = 9;   
const STATUS_TABL_COL = 9;
const MATERIA_TABL_COL = 8;
const UNIQUE_TABL_COL = 12;
const MAX_POT_INDEX = 6;   // Index into the maxPot for sorting

let weaponColHeaders = []; // array of strings for the column headers
let weaponColIndexMap = new Map(); // map of column names to column indices
let weaponColIdxToEffectMap = new Map(); // cached map of column indices to "EffectX" columns
let weaponColIdxToEffectTypeMap = new Map(); // cached map of column indices to "EffectX_Type" columns
let weaponData = []; // core weapon data; array of array of strings
let activeWeaponFilter = "";

function resetPerfReport()
{
    document.getElementById('perf_measurement').innerHTML = "Perf report:<br>";
}

function reportPerf(perfEvents)
{
    let perfText = "";

    for (const perfEvent of perfEvents)
    {
        let perfLine = " - " + perfEvent[0] + ": " + (perfEvent[2] - perfEvent[1]).toFixed(1) + "ms";
        console.log(perfLine);
        perfText += perfLine + "<br>";
    }
    document.getElementById('perf_measurement').innerHTML += perfText;
}

/* Create a table to display the result */
function tableCreate(user_row, user_col, list, header) {
    let perfTableCreateStart = performance.now();

    //body reference 
    var body = document.getElementById('Output'); 

    // header
    const h1 = document.createElement("h1"); 
    const textNode = document.createTextNode(header);
    h1.className = "weaponHeader";
    h1.appendChild(textNode);
    body.appendChild(h1);

    console.log("Table Data:", list);
  
    // create <table> and a <tbody>
    var tbl = document.createElement("table");
    let tblClassName;

    // Different format for each table 
    if (user_col == ELEM_TABL_COL) {
        tblClassName = "elemTable";
    }
    else if (user_col == MATERIA_TABL_COL) {
        tblClassName = "materiaTable";
    }
    else if (user_col == STATUS_TABL_COL) {
        tblClassName = "statusTable";
    }
    else if (user_col == UNIQUE_TABL_COL) {
        tblClassName = "uniqueTable";
    }
    else
    {
        tblClassName = "effectTable";
    }
    tbl.className = tblClassName + " cell-border display compact hover order-column stripe";

    let tblId = tblClassName + Math.random().toString(36).substr(2, 9); // Generate a unique ID for each table
    tbl.id = tblId;
    var tblBody = document.createElement("tbody");
    console.log("Creating table: " + tblClassName);

    var headerRow = document.createElement("tr");
    // create <tr> and <td>
    for (var j = 0; j < user_row; j++) {
        var row = document.createElement("tr");

        for (var i = 0; i < user_col; i++) {
            var cell;
            if (j == 0) {
                cell = document.createElement("th");
                headerRow.appendChild(cell);
            }
            else {
                cell = document.createElement("td");
                row.appendChild(cell);
            }
            var cellText;
            cellText = document.createTextNode(list[j][i] || ""); 
            cell.appendChild(cellText);
            
        }
        if (j > 0) {
            tblBody.appendChild(row);
        }
    }

    // append the <tbody> inside the <table>
    var tblHead = document.createElement("thead");
    tblHead.appendChild(headerRow);
    tbl.appendChild(tblHead);
    tbl.appendChild(tblBody);

    // put <table> in the <body>
    body.appendChild(tbl);
    let perfTableCreateEnd = performance.now();

    new DataTable('#' + tblId, {
        paging: false
    });
    let perfDataTableCreateEnd = performance.now();

    console.log("Created table: " + tblClassName);
    
    reportPerf([
        ["DOM setup", perfTableCreateStart, perfTableCreateEnd],
        ["Datatable init", perfTableCreateEnd, perfDataTableCreateEnd]
    ]);
}

function sortTable(cell) {
    // Grab the table node
    var table = cell.parentNode.parentNode;
    var col = 0;
    var asc = true;
    var swap = true;
    var shouldSwap = false;
    var count = 0;
    var isNumber = false;

    for (var i = 0; i < table.rows[0].cells.length; i++) {
        if (table.rows[0].cells[i].innerHTML == cell.innerHTML) {
            col = i;
            if (cell.innerHTML == "Pot%" || cell.innerHTML == "Max%" || cell.innerHTML == "Duration (s)"
                || cell.innerHTML == "% per ATB") {
                isNumber = true;
            }
        }
    }

    while (swap) {
        swap = false;
        var rows = table.rows;

        // Skip header row
        for (var i = 1; i < (rows.length - 1); i++) {
            shouldSwap = false;
            // get current row and the next row
            var x = rows[i].getElementsByTagName("td")[col];
            var y = rows[i + 1].getElementsByTagName("td")[col];
            var xValue = x, yValue = y;

            if (isNumber) {
                xValue = parseFloat(x.innerHTML);
                yValue = parseFloat(y.innerHTML);
            }
            else {
                xValue = x.innerHTML;
                yValue = y.innerHTML;
            }

            if (asc) {
                // Check if switch based on ascendence 

                if (xValue > yValue) {
                    shouldSwap = true;
                    break;
                }
            }
            else {
                // Check if switch based on descendence 
                if (xValue < yValue) {
                    shouldSwap = true;
                    break;
                }
            }
        }
        if (shouldSwap) {
            // Swap
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            swap = true;
            count++;
        }
        else {
            if (count == 0 && asc) {
                asc = false;
                swap = true;
            }
        }
    }   
                    
}
function readDatabase() {
    if (weaponData[0] != null) {
        return;
    }
    resetPerfReport();
    let start = performance.now();

    var location = window.location.href;
    var directoryPath = location.substring(0, location.lastIndexOf("/") + 1);
    result = loadFile(directoryPath + FILE_NAME);

    if (result != null) {
        var lines = result.split('\n');
        // get the list of columns, then build the map from column names to indices for later queries
        weaponColHeaders = TsvLineToArray(lines[0]);
        for (var colIdx = 0; colIdx < weaponColHeaders.length; ++colIdx)
        {
            weaponColIndexMap[weaponColHeaders[colIdx]] = colIdx;
        }
        // Build a cached list of all of effect types so we can easily search it later
        for (var effectIdx = 0; effectIdx < 9; ++effectIdx)
        {
            if (weaponColHeaders.includes("Effect" + effectIdx))
            {
                    weaponColIdxToEffectMap[weaponColHeaders.indexOf("Effect" + effectIdx)] = effectIdx;
            }
            if (weaponColHeaders.includes("Effect" + effectIdx + "_Type"))
            {
                weaponColIdxToEffectTypeMap[weaponColHeaders.indexOf("Effect" + effectIdx + "_Type")] = effectIdx;
            }
        }

        for (var line = 1; line < lines.length-1; line++) {
            weaponData.push(TsvLineToArray(lines[line]));
        }
    }
    let end = performance.now();
    
    reportPerf([
        ["Database load", start, end]
    ]);
}

// Find elements in an array
function findElement(arr, propName, propValue) {
    for (var i = 0; i < arr.length; i++)
        if (arr[i][propName] == propValue)
            return arr[i];
}

// Returns the value from the weapondb row for the column "name"
function getValueFromDatabaseRow(row, name) {
    return row[weaponColIndexMap[name]];
}

function findWeaponWithProperty(arr, propName, propValue) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].name == propName) {
            if (arr[i].value.indexOf(propValue) >= 0) {
                return true;
            }
        }
    }

    return false;
}

// For a given weapon row, check if the 'character' field for it matches our set of filters
// function matchWeaponByCharacter(weapon, charFilters)
// {
//     // no char filter, then they're always a match
//     if (charFilters.length == 0)
//     {
//         return true;
//     }

//     // locate the charName element, and see if it matches any of the charFilters
//     return charFilters.includes(getValueFromDatabaseItem(weapon, "Character"));
// }

// For a given weapon row, check if the 'gachaType' field for it matches our set of filters
// (note that "WeaponType" is a synonoym for the gachatype, i.e. mode of acquisition -- Limited, Ultimate, Featured...)
// function matchWeaponByWeaponType(weapon, weaponTypeFilters)
// {
//     // no active filter, then they're always a match
//     if (weaponTypeFilters.length == 0)
//     {
//         return true;
//     }
//     return weaponTypeFilters.includes(getValueFromDatabaseItem(weapon, "GachaType"));
// }


// Simple query to filter the input database down to just the rows where the value in columnToCheck is a match for one of matchValues
// (used for initialy, coarse, filters)
function getWeaponsMatchingFilter(database, columnToCheck, matchValues)
{
    if (matchValues.length == 0)
    {
        return database;
    }
    let filteredDb = [];
    let colIdxToSearch = weaponColIndexMap[columnToCheck];
    for (var rowIdx = 0; rowIdx < database.length; ++rowIdx)
    {
        if (matchValues.includes(database[rowIdx][colIdxToSearch]))
        {
            filteredDb.push(database[rowIdx]);
        }
    }
    return filteredDb;
}

// Query to filter the input database down to just the rows where one of the "Effect"
// columns matches the input effects provided
function getWeaponsMatchingEffect(database, effect)
{
    let filteredDb = [];
    let colIdxToSearchs = [];
    
    for (var rowIdx = 0; rowIdx < database.length; ++rowIdx)
    {
        // iterate over each colidx in the effect map
        for (colIdx in weaponColIdxToEffectMap)
        {
            if (effect == database[rowIdx][colIdx])
            {
                filteredDb.push(database[rowIdx]);
                break;
            }
        }
    }
    return filteredDb;
}

function getActiveCharacterFilter()
{
    let charFilters = [];
    const charFilterElements = document.getElementsByName("char_filter");

    for (const charFilterElement of charFilterElements)
    {
        if (charFilterElement.checked)
        {
            charFilters.push(charFilterElement.value);
        }
    }
    return charFilters;
}

function getActiveWeaponTypeFilter()
{
    let weaponFilters = [];
    const weaponFilterElements = document.getElementsByName("weapon_filter");

    for (const weaponFilterElement of weaponFilterElements)
    {
        if (weaponFilterElement.checked)
        {
            weaponFilters.push(weaponFilterElement.value);
        }
    }

    return weaponFilters;
}

function elementalCompare(a, b) {
    var aItem = parseFloat(a[MAX_POT_INDEX]);
    var bItem = parseFloat(b[MAX_POT_INDEX]);
    if (aItem < bItem) {
        return 1;
    }
    if (aItem > bItem) {
        return -1;
    }
    return 0;
}

function refreshTable()
{
    resetPerfReport();
    console.log ("Refreshing table with filter \"" + activeWeaponFilter + "\"");

    // clear the table(s) that may be there already
    var divToPrint = document.getElementById('Output');
    divToPrint.innerHTML = ''

    // hide or reveal the root menu if we have a filter set or not
    if (activeWeaponFilter == "")
    {
        document.getElementById("ecDropdown").classList.add("show");
    }
    else
    {
        document.getElementById("ecDropdown").classList.remove("show");
    }

    switch (activeWeaponFilter)
    {
        case "Fire": 
            printElemWeapon("Fire");
            break;
        case "Ice": 
            printElemWeapon("Ice");
            break;
        case "Lightning": 
            printElemWeapon("Lightning");
            break;
        case "Water": 
            printElemWeapon("Water");
            break;
        case "Wind": 
            printElemWeapon("Wind");
            break;
        case "Earth": 
            printElemWeapon("Earth");
            break;
        case "None": 
            printElemWeapon("None");
            break;
        case "Limited":
            printLimitedWeapon("", "Limited/Crossover Weapons:");
            break;
        case "DebuffMatk":
            printWeaponEffect("[Debuff] MATK", "Weapon with [Debuff] MATK:");
            break;
        case "DebuffPdef":
            printWeaponEffect("[Debuff] PDEF", "Weapon with [Debuff] PDEF:");
            break;
        case "DebuffMdef":
            printWeaponEffect("[Debuff] MDEF", "Weapon with [Debuff] MDEF:");
            break;
        case "DebuffPatk":
            printWeaponEffect("[Debuff] PATK", "Weapon with [Debuff] PATK:");
            break;
        case "BuffMatk":
            printWeaponEffect("[Buff] MATK", "Weapon with [Buff] MATK:");
            break;
        case "BuffPdef":
            printWeaponEffect("[Buff] PDEF", "Weapon with [Buff] PDEF:");
            break;
        case "BuffMdef":
            printWeaponEffect("[Buff] MDEF", "Weapon with [Buff] MDEF:");
            break;
        case "BuffPatk":
            printWeaponEffect("[Buff] PATK", "Weapon with [Buff] PATK:");
            break;
        case "BuffWex":
            printWeaponEffect("[Buff] Weakness", "Weapon with Exploit Weakness:");
            break;
        case "Heal":
            printHealWeapon();
            break;
        case "Provoke":
            printProvokeWeapon();
            break;
        case "SigilCircle":
            printWeaponMateria("Circle", "Weapon with ◯ Sigil Materia Slot:");
            break;
        case "SigilCross":
            printWeaponMateria("X Sigil", "Weapon with ✕ Sigil Materia Slot:");
            break;
        case "SigilTriangle":
            printWeaponMateria("Triangle", "Weapon with △ Sigil Materia Slot:");
            break;
        case "SigilDiamond":
            printWeaponSigil("Diamond", "Weapon with ◊ Sigil Materia Slot:");
            break;
        case "UniqueEffect":
            printUniqueEffectWeapon();
            break;
        case "All":
            printAllWeapon("", "List of All Weapons:");
            break;
    }
}

function clearFilter()
{ 
    activeWeaponFilter = "";
    refreshTable();
}

function filterFire()
{
    activeWeaponFilter = "Fire";
    refreshTable();
}

function filterIce()
{
    activeWeaponFilter = "Ice";
    refreshTable();
}

function filterLightning()
{
    activeWeaponFilter = "Lightning";
    refreshTable();
}

function filterWater()
{
    activeWeaponFilter = "Water";
    refreshTable();
}

function filterWind()
{
    activeWeaponFilter = "Wind";
    refreshTable();
}

function filterEarth()
{
    activeWeaponFilter = "Earth";
    refreshTable();
}

function filterNonElem()
{
    activeWeaponFilter = "None";
    refreshTable();
}

function filterLimited()
{
    activeWeaponFilter = "Limited";
    refreshTable();
}

function filterMatkDown()
{
    activeWeaponFilter = "DebuffMatk";
    refreshTable();
}

function filterPatkDown()
{
    activeWeaponFilter = "DebuffPatk";
    refreshTable();
}

function filterPdefDown()
{
    activeWeaponFilter = "DebuffPdef";
    refreshTable();
}

function filterMdefDown()
{
    activeWeaponFilter = "DebuffMdef";
    refreshTable();
}

function filterPatkUp()
{
    activeWeaponFilter = "BuffPatk";
    refreshTable();
}

function filterMatkUp()
{
    activeWeaponFilter = "BuffMatk";
    refreshTable();
}

function filterPdefUp()
{
    activeWeaponFilter = "BuffPdef";
    refreshTable();
}

function filterMdefUp()
{
    activeWeaponFilter = "BuffMdef";
    refreshTable();
}

function filterHeal() {
    activeWeaponFilter = "Heal";
    refreshTable();
}

function filterProvoke() {
    activeWeaponFilter = "Provoke";
    refreshTable();
}

function printHealWeapon() {
    var header = "Non-Regen Healing Weapon (> 25% Potency):";
    printWeaponElem("Heal", header);

    var header = "Regen Healing Weapon:";
    printRegenWeapon(header);

    var header = "Weapon with All (Cure) Materia Slot:";
    printWeaponMateria("All (Cure)", header);
}

function printProvokeWeapon() {
    var header = "Provoke Weapon:";
    printWeaponEffect("[Buff] Provoke", header);

    var header = "Veil Weapon:";
    printWeaponEffect("[Buff] Veil", header);
}

function filterExploitWeakness(){
    activeWeaponFilter = "BuffWex";
    refreshTable();
}

function filterCircleSigilMateria() {
    activeWeaponFilter = "SigilCircle";
    refreshTable();
}


function filterTriangleSigilMateria() {
    activeWeaponFilter = "SigilTriangle";
    refreshTable();
}

function filterXSigilMateria() {
    activeWeaponFilter = "SigilCross";
    refreshTable();
}

function filterDiamondMateria() {
    activeWeaponFilter = "SigilDiamond";
    refreshTable();
}

function filterUniqueEffect() {
    activeWeaponFilter = "UniqueEffect";
    refreshTable();
}

function printUniqueEffectWeapon() {
    var header = "Weapon Applying Status:";
    printWeaponUniqueEffect("[Status Apply]", header);

    var header = "Weapon Removing Status:";
    printWeaponUniqueEffect("[Status Cleanse]", header);

    header = "Weapon with Dispel Effect:";
    printWeaponUniqueEffect("[Dispel", header);

    header = "Weapon with Haste Effect:";
    printWeaponEffect("Haste", header);

    header = "Weapon with Increase Command Gauge Effect:";
    printWeaponEffect("Increases Command Gauge", header);
}

function filterAll() {
    activeWeaponFilter = "All";
    refreshTable();
}

function printElemWeapon(elem) {
    document.getElementById("ecDropdown").classList.remove("show");

    var header = "Weapon with C-Abilities - " + elem;
    printWeaponElem(elem, header);

    if (elem != "None") {
        printWeaponEffect(elem + " Resistance Down",               "Weapons with " + elem + " Resistance Down:", true);
        printWeaponEffect(elem + " Damage Up",                     "Weapons with " + elem + " Damage Up:", true);
        printWeaponEffect(elem + " Damage Bonus",                  "Weapons with " + elem + " Damage Bonus:");
        printWeaponEffect(elem + " Weapon Boost",                  "Weapons with " + elem + " Weapon Boost:");
        printWeaponEffect("Status Ailment: " + elem + " Weakness", "Weapons with " + elem + " Weakness:");
        printWeaponEffect(elem + " Resistance Up",                 "Weapons with " + elem + " Resistance Up:", true);
        printWeaponEffect(elem + " Damage Down",                   "Weapons with " + elem + " Damage Down:", true);
        
        printWeaponMateria(elem, "Weapon with " + elem + " Materia Slot:");
    }
}

function printLimitedWeapon(elem, header) {
    readDatabase();
    let elemental;
    elemental = [["Weapon Name", "Char", "AOE", "Type", "ATB", "Element", "Pot%", "Max%", "% per ATB", "Condition"]];

    let activeChars = getActiveCharacterFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "GachaType", "Limited");
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "Character", activeChars);

    for (var i = 0; i < filteredWeaponData.length; i++) {
        // Make a new row and push them into the list
        let row = [];

        row.push(getValueFromDatabaseItem(weaponRow, "Name"));
        row.push(getValueFromDatabaseItem(filteredWeaponData[i], "Character"));
        row.push(getValueFromDatabaseItem(filteredWeaponData[i], "Ability Range"));
        row.push(getValueFromDatabaseItem(filteredWeaponData[i], "GachaType"));

        var atb = getValueFromDatabaseItem(filteredWeaponData[i], "Ability ATB");
        row.push(atb);
        row.push(getValueFromDatabaseItem(filteredWeaponData[i], "Ability Element"));

        var pot, maxPot;

        pot = parseInt(getValueFromDatabaseItem(filteredWeaponData[i], "Ability Pot. %"));
        row.push(pot);

        maxPot = parseInt(getValueFromDatabaseItem(filteredWeaponData[i], "maxPotOb10"));
        row.push(maxPot);

        // % per ATB
        if (atb != 0) {
            row.push((maxPot / atb).toFixed(0));
        }
        else {
            row.push(maxPot);
        }

        if (elem != "Heal") {
            // // @todo: Need to figure out a good way to deal with this stupid weapon
            // if ((maxPot > pot) || (getValueFromDatabaseItem(filteredWeaponData[i], "name") == "Bahamut Greatsword") ||
            //     (getValueFromDatabaseItem(filteredWeaponData[i], "name") == "Sabin's Claws") || 
            //     (getValueFromDatabaseItem(filteredWeaponData[i], "name") == "Blade of the Worthy") || 
            //     (getValueFromDatabaseItem(weaponRow, "name") == "Umbral Blade")) {
            //     // Check to see if DMG+ Condition is from Effect1 or Effect2 
            //     if (findWeaponWithProperty(weaponRow, 'effect1', "DMG")) {
            //         row.push(getValueFromDatabaseItem(weaponRow, "condition1"));
            //     }
            //     else {
            //         row.push(getValueFromDatabaseItem(weaponRow, "condition2"));
            //     }
            // }
            // else {
            //     row.push("");
            // }
        }

        elemental.push(row);
    }
    elemental.sort(elementalCompare);

    tableCreate(elemental.length, elemental[0].length, elemental, header);
}

function printAllWeapon(elem, header) {
    readDatabase();
    let elemental;
    elemental = [["Weapon Name", "Char", "AOE", "Type", "ATB", "Element", "Pot%", "Max%", "% per ATB", "Type", "Condition"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    for (var i = 0; i < weaponDatabase.length; i++) {
        var found = true;

        found = found && matchWeaponByCharacter(weaponRow, activeChars);
        found = found && matchWeaponByWeaponType(weaponRow, activeWeaponTypes);

        if (found) {
            // Make a new row and push them into the list
            let row = [];

            row.push(getValueFromDatabaseItem(weaponRow, "name"));
            row.push(getValueFromDatabaseItem(weaponRow, "charName"));
            row.push(getValueFromDatabaseItem(weaponRow, "range"));
            row.push(getValueFromDatabaseItem(weaponRow, "type"));

            var atb = getValueFromDatabaseItem(weaponRow, "atb");
            row.push(atb);

            row.push(getValueFromDatabaseItem(weaponRow, "element"));

            var pot, maxPot;

            pot = parseInt(getValueFromDatabaseItem(weaponRow, "potOb10"));
            row.push(pot);

            maxPot = parseInt(getValueFromDatabaseItem(weaponRow, "maxPotOb10"));
            row.push(maxPot);

            // % per ATB
            if (atb != 0) {
                row.push((maxPot / atb).toFixed(0));
            }
            else {
                row.push(maxPot);
            }

            type = getValueFromDatabaseItem(weaponRow, "gachaType");
            if (type == "L") {
                row.push("Limited");
            }
            else if (type == "Y") {
                row.push("Event");
            }
            else {
                row.push("Featured");
            }

            if (elem != "Heal") {
                // @todo: Need to figure out a good way to deal with this stupid weapon
                if ((maxPot > pot) || (getValueFromDatabaseItem(weaponRow, "name") == "Bahamut Greatsword") ||
                    (getValueFromDatabaseItem(weaponRow, "name") == "Sabin's Claws") ||
                    (getValueFromDatabaseItem(weaponRow, "name") == "Blade of the Worthy") ||
                    (getValueFromDatabaseItem(weaponRow, "name") == "Umbral Blade")) {
                    // Check to see if DMG+ Condition is from Effect1 or Effect2 
                    if (findWeaponWithProperty(weaponRow, 'effect1', "DMG")) {
                        row.push(getValueFromDatabaseItem(weaponRow, "condition1"));
                    }
                    else {
                        row.push(getValueFromDatabaseItem(weaponRow, "condition2"));
                    }
                }
                else {
                    row.push("");
                }
            }

            elemental.push(row);
        }


    }

    tableCreate(elemental.length, elemental[0].length, elemental, header);
}


function printWeaponElem(elem, header) {
    readDatabase();

    let elemental = [["Weapon Name", "Character", "Range", "Type", "ATB", "Uses", "Pot%", "Max Pot%", "% per ATB", "Condition for Max"]];

    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Character", activeChars);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "GachaType", activeWeaponTypes);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "Ability Element", elem);

    for (var i = 0; i < filteredWeaponData.length; i++) {
        let weaponRow = filteredWeaponData[i];
        if (elem == "Heal") {
            // Low % heal is not worth it - set threshold at 20
            if (parseInt(getValueFromDatabaseRow(weaponRow, "Ability Pot. %")) < 20)
                continue;
        }

        // Make a new row and push them into the list
        let row = [];

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Range"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        var atb = getValueFromDatabaseRow(weaponRow, "Command ATB");
        row.push(atb);

        var useCount = getValueFromDatabaseRow(weaponRow, "Use Count");
        row.push(useCount);

        var pot, maxPot;            
        pot = parseInt(getValueFromDatabaseRow(weaponRow, "Ability Pot. %"));
        
        // Find any "Additional Effect" that can multiply the ability damage
        maxPot = pot;

        var condition = "";
        for (colIdx in weaponColIdxToEffectTypeMap)
        {
            if (weaponRow[colIdx] == "AdditionalEffect")
            {
                var effectIdx = weaponColIdxToEffectTypeMap[colIdx];
                // Check the description for a damage multiplier
                var addlEffectType = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx)
                if (addlEffectType == "Multiply Damage")
                {
                    // got a mult, fetch the pot (it's a string in percentage so parseint will get us the leading numbers)
                    var multPot = parseFloat(getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Pot"));
                    maxPot = pot * (multPot / 100.0);
                    condition = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Condition") + ", damage is increased by " + (multPot / 100) + "x";
                }
            }
        }
        row.push(pot);
        row.push(maxPot);
        row.push((maxPot / Math.max(atb,1)).toFixed(0));
        row.push(condition);

        elemental.push(row);
    }

    elemental.sort(elementalCompare);

    tableCreate(elemental.length, elemental[0].length, elemental, header);
}


function printWeaponSigil(sigil, header) {
    readDatabase();
    let materia = [["Weapon Name", "Char", "AOE", "Type", "Elem", "ATB", "Uses", "Pot%", "Max%"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    for (var i = 0; i < weaponDatabase.length; i++) {
        var found = findWeaponWithProperty(weaponRow, 'sigil', sigil);
        found = found && matchWeaponByCharacter(weaponRow, activeChars);
        found = found && matchWeaponByWeaponType(weaponRow, activeWeaponTypes);

        if (found) {
            let row = [];
            
            row.push(getValueFromDatabaseItem(weaponRow, "name"));
            row.push(getValueFromDatabaseItem(weaponRow, "charName"));
            row.push(getValueFromDatabaseItem(weaponRow, "range"));
            row.push(getValueFromDatabaseItem(weaponRow, "type"));
            row.push(getValueFromDatabaseItem(weaponRow, "element"));
            row.push(getValueFromDatabaseItem(weaponRow, "atb"));
            row.push(getValueFromDatabaseItem(weaponRow, "uses"));
            row.push(getValueFromDatabaseItem(weaponRow, "potOb10"));
            row.push(getValueFromDatabaseItem(weaponRow, "maxPotOb10"));

            materia.push(row);
        }
    }

    tableCreate(materia.length, materia[0].length, materia, header);
}
function printWeaponMateria(elemMateria, header) {
    readDatabase();
    let materia = [["Weapon Name", "Char", "AOE", "Type", "Elem", "ATB", "Uses", "Pot%", "Max%"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    for (var i = 0; i < weaponDatabase.length; i++) {
        var found = false;
        found = found || findWeaponWithProperty(weaponRow, 'support1', elemMateria);
        found = found || findWeaponWithProperty(weaponRow, 'support2', elemMateria);
        found = found || findWeaponWithProperty(weaponRow, 'support3', elemMateria);
        found = found && matchWeaponByCharacter(weaponRow, activeChars);
        found = found && matchWeaponByWeaponType(weaponRow, activeWeaponTypes);

        if (found) {

            let row = [];
            row.push(getValueFromDatabaseItem(weaponRow, "name"));
            row.push(getValueFromDatabaseItem(weaponRow, "charName"));
            row.push(getValueFromDatabaseItem(weaponRow, "range"));
            row.push(getValueFromDatabaseItem(weaponRow, "type"));
            row.push(getValueFromDatabaseItem(weaponRow, "element"));
            row.push(getValueFromDatabaseItem(weaponRow, "atb"));
            row.push(getValueFromDatabaseItem(weaponRow, "uses"));
            row.push(getValueFromDatabaseItem(weaponRow, "potOb10"));
            row.push(getValueFromDatabaseItem(weaponRow, "maxPotOb10"));

            materia.push(row);
        }
    }

    tableCreate(materia.length, materia[0].length, materia, header);
}

function printRegenWeapon(header) {
    readDatabase();
    let effect = [["Name", "Char", "Type", "ATB", "Uses", "AOE", "Target", "Duration (s)", "Pot%", "Max%", "% per ATB"]];
    var text = "Regen";

    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    for (var i = 0; i < weaponDatabase.length; i++) {
        var found = findWeaponWithProperty(weaponRow, 'element', "Heal");
        var found1 = found && findWeaponWithProperty(weaponRow, 'effect1', text);
        var found2 = found && findWeaponWithProperty(weaponRow, 'effect2', text);
        found = (found1 || found2) && matchWeaponByCharacter(weaponRow, activeChars);
        found = found && matchWeaponByWeaponType(weaponRow, activeWeaponTypes);

        if (found) {
            // Make a new row and push them into the list
            let row = [];

            row.push(getValueFromDatabaseItem(weaponRow, "name"));
            row.push(getValueFromDatabaseItem(weaponRow, "charName"));
            row.push(getValueFromDatabaseItem(weaponRow, "type"));

            var atb = getValueFromDatabaseItem(weaponRow, "atb");
            row.push(atb);

            row.push(getValueFromDatabaseItem(weaponRow, "uses"));

            var dur, pot, maxPot;

            if (found1) {
                row.push(getValueFromDatabaseItem(weaponRow, "effect1Range"));
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponRow, "effect2Range"));
            }
            if (found1) {
                row.push(getValueFromDatabaseItem(weaponRow, "effect1Target"));

                dur = parseInt(getValueFromDatabaseItem(weaponRow, "effect1Dur"));
                row.push(dur);               
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponRow, "effect2Target"));

                dur = parseInt(getValueFromDatabaseItem(weaponRow, "effect2Dur"));
                row.push(dur);
            }

            pot = parseInt(getValueFromDatabaseItem(weaponRow, "potOb10"));
            row.push(pot);
            maxPot = pot;   

            if (dur != 0) {
                // Regen is 15% per tick every 3s + initial tick for total
                maxPot = Math.floor(dur / 3) * 15 + pot;
            }
            row.push(maxPot);

            if (atb != 0) {
                row.push((maxPot / atb).toFixed(0));
            }
            else {
                row.push(maxPot);
            }

            effect.push(row);
        }
    }

    tableCreate(effect.length, effect[0].length, effect, header);
}

function printWeaponEffect(effect, header, includeMaxPot) {
    readDatabase();

    let effectTable = [["Weapon Name", "Character","Range",  "Type", "ATB", "Uses","Pot", "Max Pot",  "Duration (s)", "Extension (s)", "Condition"]];
    if (!includeMaxPot)
    {
        effectTable[0].splice(effectTable[0].indexOf("Max Pot"), 1);
    }
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Character", activeChars);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "GachaType", activeWeaponTypes);
    filteredWeaponData = getWeaponsMatchingEffect(filteredWeaponData, effect);
    
    for (var i = 0; i < filteredWeaponData.length; i++) {
        var weaponRow = filteredWeaponData[i];
        // Make a new row and push them into the list
        let row = [];

        var effectDesc = "";
        var effectRange = "";
        var effectPot = "";
        var effectPotMax = "";
        var effectDuration = "";
        var effectExtend = "";
        var effectCondition = "";

        // find which effectIdx we're actually interested in
        for (colIdx in weaponColIdxToEffectMap)
        {
            if (effect == (weaponRow[colIdx]))
            {
                const effectIdx = weaponColIdxToEffectMap[colIdx];
                effectDesc = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx);
                effectRange = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Range");
                effectPot = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Pot");
                effectPotMax = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_PotMax");
                effectDuration = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Duration");
                effectExtend = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Extend");
                effectCondition = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Condition");
            }
        }

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(effectRange);
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        row.push(getValueFromDatabaseRow(weaponRow, "Command ATB"));
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));
        row.push(effectPot);
        if (includeMaxPot)
        {
            row.push(effectPotMax);
        }
        row.push(effectDuration);
        row.push(effectExtend);
        row.push(effectCondition);

        effectTable.push(row);
    }

    tableCreate(effectTable.length, effectTable[0].length, effectTable, header);
}

function printWeaponUniqueEffect(text, header) {
    readDatabase();
    let effect = [["Name", "Char", "AOE", "Type", "Elem", "ATB", "Uses", "Target1", "Effect1", "Condition1", "Target2", "Effect2", "Condition2"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();
    
    for (var i = 0; i < weaponDatabase.length; i++) {
        var found1 = findWeaponWithProperty(weaponRow, 'effect1', text);
        var found2 = findWeaponWithProperty(weaponRow, 'effect2', text);
        var found = (found1 || found2);
        found = found && matchWeaponByCharacter(weaponRow, activeChars);
        found = found && matchWeaponByWeaponType(weaponRow, activeWeaponTypes);
        if (found) {
            let row = [];

            row.push(getValueFromDatabaseItem(weaponRow, "name"));
            row.push(getValueFromDatabaseItem(weaponRow, "charName"));
            if (found1) {
                row.push(getValueFromDatabaseItem(weaponRow, "effect1Range"));
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponRow, "effect2Range"));
            }

            row.push(getValueFromDatabaseItem(weaponRow, "type"));
            row.push(getValueFromDatabaseItem(weaponRow, "element"));
            row.push(getValueFromDatabaseItem(weaponRow, "atb"));
            row.push(getValueFromDatabaseItem(weaponRow, "uses"));

            row.push(getValueFromDatabaseItem(weaponRow, "effect1Target"));
            var str = getValueFromDatabaseItem(weaponRow, "effect1");
            var indexOfFirst = str.indexOf(text);
            if (indexOfFirst >= 0) {
                var newstr = str.substring(indexOfFirst + text.length + 1);
                row.push(newstr);
            }
            else {
                row.push(str);
            }

            row.push(getValueFromDatabaseItem(weaponRow, "condition1"));

            row.push(getValueFromDatabaseItem(weaponRow, "effect2Target"));

            var str = getValueFromDatabaseItem(weaponRow, "effect2");
            var indexOfFirst = str.indexOf(text);
            if (indexOfFirst >= 0) {
                var newstr = str.substring(indexOfFirst + text.length + 1);
                row.push(newstr);
            }
            else {
                row.push(str);
            }

            row.push(getValueFromDatabaseItem(weaponRow, "condition2"));


            effect.push(row);
        }
    }

    tableCreate(effect.length, effect[0].length, effect, header);
}

// Load file from local server
function loadFile(filePath) {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    xmlhttp.send();
    if (xmlhttp.status == 200) {
        result = xmlhttp.responseText;
    }
    return result;
}


// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function TsvLineToArray( strData ){
    var cells = strData.split('\t');
    for (let idx = 0; idx < cells.length; idx++) {
        cells[idx] = cells[idx].trim();
    }
    return cells;
}
