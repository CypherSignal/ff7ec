// python -m http.server

/* Trash code - Need to clean up and add comments and stuff*/
/* When the user clicks on the button, toggle between hiding and showing the dropdown content */

const FILE_NAME = 'weaponData.tsv'
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

    let abilityDescTargetIdx = list[0].indexOf("Ability Description");
    columnsWithLineEnd = []
    if (abilityDescTargetIdx != -1)
    {
        columnsWithLineEnd.push(abilityDescTargetIdx);
    }
    
    new DataTable('#' + tblId, {
        paging: false,
        columnDefs: [
            {
                render: function (data, type, row) {
                    if (data.indexOf("\\n") == -1)
                    {
                        return data;
                    }
                    else
                    {
                        return "" + data.replaceAll("\\n", '<li>') + "";
                    }
                },
                targets: columnsWithLineEnd,
            },
        ]
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
        if (database[rowIdx][colIdxToSearch] != "" && matchValues.includes(database[rowIdx][colIdxToSearch]))
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

// Query to filter the input database down to just the rows where one of the "EffectType"
// columns matches the input effects provided
function getWeaponsMatchingEffectType(database, effectType)
{
    let filteredDb = [];
    let colIdxToSearchs = [];
    
    for (var rowIdx = 0; rowIdx < database.length; ++rowIdx)
    {
        // iterate over each colidx in the effect map
        for (colIdx in weaponColIdxToEffectTypeMap)
        {
            if (effectType == database[rowIdx][colIdx])
            {
                filteredDb.push(database[rowIdx]);
                break;
            }
        }
    }
    return filteredDb;
}

// Query to filter the input database down to just the rows where one of the MateriaSupports matches the filter
function getWeaponsWithMateriaMatchingFilter(database, filter)
{
    let filteredDb = [];
    let colIdxToSearch0 = weaponColIndexMap["MateriaSupport0"];
    let colIdxToSearch1 = weaponColIndexMap["MateriaSupport1"];
    let colIdxToSearch2 = weaponColIndexMap["MateriaSupport2"];
    for (var rowIdx = 0; rowIdx < database.length; ++rowIdx)
    {
        if (database[rowIdx][colIdxToSearch0].indexOf(filter) != -1 ||
            database[rowIdx][colIdxToSearch1].indexOf(filter) != -1 ||
            database[rowIdx][colIdxToSearch2].indexOf(filter) != -1 )
        {
            filteredDb.push(database[rowIdx]);
        }
    }
    return filteredDb;
}

function getWeaponsWithValueGreaterThan(database, columnToCheck, minValue)
{
    let filteredDb = [];
    let colIdxToSearch = weaponColIndexMap[columnToCheck];
    for (var rowIdx = 0; rowIdx < database.length; ++rowIdx)
    {
        let value = parseFloat(database[rowIdx][colIdxToSearch]);
        if (value == NaN || value > minValue)
        {
            filteredDb.push(database[rowIdx]);
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

function addAbilityTextToTable(weaponData, outputTable)
{
    if(document.getElementById("show_full_ability").checked)
    {
        outputTable[0].push("Ability Description");
        let colIdxToFetch = weaponColIndexMap["Ability Text"];

        for (var i = 0; i < weaponData.length; i++) {
            let weaponRow = weaponData[i];
            outputTable[i+1].push(weaponRow[colIdxToFetch]);
        }
    }
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
        case "Non-Elemental": 
            printElemWeapon("Non-Elemental");
            break;
        case "DebuffMatk":
            printWeaponEffect("MATK Down", "Weapon with Debuff MATK:", true, true, true, false);
            break;
        case "DebuffPdef":
            printWeaponEffect("PDEF Down", "Weapon with Debuff PDEF:", true, true, true, false );
            printWeaponEffect("Status Ailment: Single-Tgt. Phys. Dmg. Rcvd. Up", "Weapon with Single-Tgt. Phys. Dmg. Rcvd. Up:", true, false, true, false);
            break;
        case "DebuffMdef":
            printWeaponEffect("MDEF Down", "Weapon with Debuff MDEF:", true, true, true, false);
            printWeaponEffect("Status Ailment: Single-Tgt. Mag. Dmg. Rcvd. Up", "Weapon with Single-Tgt. Mag. Dmg. Rcvd. Up:", true, false, true, false);
            break;
        case "DebuffPatk":
            printWeaponEffect("PATK Down", "Weapon with Debuff PATK:", true, true, true, false);
            break;
        case "BuffMatk":
            printWeaponEffect("MATK Up", "Weapon with Buff MATK:", true, true, true, false);
            printWeaponEffect("Mag. Damage Bonus", "Weapon with Mag. Damage Bonus:", true, false, true, false);
            printWeaponEffect("Mag. Weapon Boost", "Weapon with Mag. Weapon Boost:", true, false, true, false);
            printWeaponEffect("Amp. Mag. Abilities", "Weapon with Amp. Mag. Abilities:", true, false, true, true);
            break;
        case "BuffPdef":
            printWeaponEffect("PDEF Up", "Weapon with Buff PDEF:",true, true, true, false);
            printWeaponEffect("Physical Resistance Increased", "Weapon with Physical Resistance Increased:",true, false, true, false);
            break;
        case "BuffMdef":
            printWeaponEffect("MDEF Up", "Weapon with Buff MDEF:", true, true, true, false);
            printWeaponEffect("Magic Resistance Increased", "Weapon with Magic Resistance Increased:", true, false, true, false);
            break;
        case "BuffPatk":
            printWeaponEffect("PATK Up", "Weapon with Buff PATK:", true, true, true, false);
            printWeaponEffect("Phys. Damage Bonus", "Weapon with Phys. Damage Bonus:", true, false, true, false);
            printWeaponEffect("Phys. Weapon Boost", "Weapon with Phys. Weapon Boost:", true, false, true, false);
            printWeaponEffect("Amp. Phys. Abilities", "Weapon with Amp. Phys. Abilities:",true, false, true, true);
            break;
        case "BuffWex":
            printWeaponEffect("Exploit Weakness", "Weapon with Exploit Weakness:",true, false, true, false);
            printWeaponEffect("Status Ailment: Enfeeble", "Weapon with Enfeeble:",true, false, true, false);
            printWeaponEffect("Applied Stats Buff Tier Increased", "Weapon with Buff Enhancement:", true, true, false, false);
            printWeaponEffect("Applied Stats Debuff Tier Increased", "Weapon with Debuff Enhancement:", true, true, false, false);
            break;
        case "Heal":
            printWeaponElem("Heal", "Non-Regen Healing Weapon (> 25% Potency):");
            printWeaponMateria("All (Cure", "Weapon with All (Cure) Materia Slot:");
            printWeaponMateria("All (Esuna",  "Weapon with All (Esuna) Materia Slot:");
            printWeaponEffect("HP Gain", "Weapon with HP Gain", true, false, true, false);
            printWeaponCancelEffect("Weapon with Remove Effect");
            break;
        case "Provoke":
            printWeaponEffect("Provoke", "Weapon with Provoke:", false, false, true, false);
            printWeaponEffect("Veil", "Weapon with Veil:", true, false, true, false);
            break;
        case "SigilCircle":
            printWeaponMateria("Circle", "Weapon with ◯ Sigil Materia Slot:");
            printWeaponSigil("◯ Circle", "Weapon with ◯ Sigil Materia on Ability:");
            break;
        case "SigilCross":
            printWeaponMateria("Cross", "Weapon with ✕ Sigil Materia Slot:");
            printWeaponSigil("✕ Cross", "Weapon with ✕ Sigil Materia on Ability:");
            break;
        case "SigilTriangle":
            printWeaponMateria("Triangle", "Weapon with △ Sigil Materia Slot:");
            printWeaponSigil("△ Triangle", "Weapon with △ Sigil Materia on Ability:");
            break;
        case "SigilDiamond":
            printWeaponSigil("◊ Diamond", "Weapon with ◊ Sigil Materia on Ability:");
            break;
        case "UniqueEffect":
            printTimeWeapons();
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
    activeWeaponFilter = "Non-Elemental";
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

function printTimeWeapons() {
    printWeaponEffect("Haste", "Weapon with Haste Effect:", false, false, true, false);
    printWeaponEffect("Increases Command Gauge", "Weapon with Increase Command Gauge Effect:", true, false, false, false);
    printWeaponEffect("Phys. ATB Conservation Effect", "Weapon with Phys. ATB Conservation Effect:",true, false, true, false);
    printWeaponEffect("Mag. ATB Conservation Effect", "Weapon with Mag. ATB Conservation Effect:", true, false, true, false);
    printWeaponEffect("Status Ailment: Stop", "Weapon with Stop Effect:", false, false, true, false);
    printWeaponEffect("Status Ailment: Stun", "Weapon with Stun Effect:", false, false, true, false);
}

function filterAll() {
    activeWeaponFilter = "All";
    refreshTable();
}

function printElemWeapon(elem) {
    document.getElementById("ecDropdown").classList.remove("show");

    var header = "Weapon with C-Abilities - " + elem;
    printWeaponElem(elem, header);

    if (elem != "Non-Elemental") {
        printWeaponEffect(elem + " Resistance Down",               "Weapons with " + elem + " Resistance Down:",true, true, true, false);
        printWeaponEffect(elem + " Damage Up",                     "Weapons with " + elem + " Damage Up:",true, true, true, false);
        printWeaponEffect(elem + " Damage Bonus",                  "Weapons with " + elem + " Damage Bonus:",true, true, true, false);
        printWeaponEffect(elem + " Weapon Boost",                  "Weapons with " + elem + " Weapon Boost:", true, true, true, false);
        printWeaponEffect("Status Ailment: " + elem + " Weakness", "Weapons with " + elem + " Weakness:",true, true, true, false);
        printWeaponEffect(elem + " Resistance Up",                 "Weapons with " + elem + " Resistance Up:", true, true, true, false);
        printWeaponEffect(elem + " Damage Down",                   "Weapons with " + elem + " Damage Down:", true, true, true, false);
        
        printWeaponMateria(elem, "Weapon with " + elem + " Materia Slot:");
    }
}

function printAllWeapon(elem, header) {
    readDatabase();
    let elemental;
    elemental = [["Weapon Name", "Char", "AOE", "Type", "ATB", "Element", "Pot%", "Max%", "% per ATB", "Condition", "Equipment Type"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Character", activeChars);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "GachaType", activeWeaponTypes);
    
    for (var i = 0; i < filteredWeaponData.length; i++) {
        let weaponRow = filteredWeaponData[i];

        // Make a new row and push them into the list
        let row = [];

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Range"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        var atb = getValueFromDatabaseRow(weaponRow, "Command ATB");
        row.push(atb);
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Element"));

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
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));

        elemental.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, effectTable);

    tableCreate(elemental.length, elemental[0].length, elemental, header);
}


function printWeaponElem(elem, header) {
    readDatabase();

    let elemental = [["Weapon Name", "Character", "Range", "Type", "ATB", "Uses", "Pot%", "Max Pot%", "% per ATB", "Condition for Max", "Equipment Type"]];

    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Character", activeChars);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "GachaType", activeWeaponTypes);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "Ability Element", elem);
    // Low % heal is not worth it - set threshold at 20
    if (elem == "Heal") {
        filteredWeaponData = getWeaponsWithValueGreaterThan(filteredWeaponData,"Ability Pot. %", 25);
    }

    for (var i = 0; i < filteredWeaponData.length; i++) {
        let weaponRow = filteredWeaponData[i];

        // Make a new row and push them into the list
        let row = [];

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Range"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        var atb = getValueFromDatabaseRow(weaponRow, "Command ATB");
        row.push(atb);
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));

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
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));

        elemental.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, elemental);

    tableCreate(elemental.length, elemental[0].length, elemental, header);
}

function printWeaponSigil(sigil, header) {
    readDatabase();
 
    let elemental = [["Weapon Name", "Character", "Range", "Type", "ATB", "Uses", "Equipment Type"]];

    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Character", activeChars);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "GachaType", activeWeaponTypes);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "Command Sigil", sigil);

    for (var i = 0; i < filteredWeaponData.length; i++) {
        let weaponRow = filteredWeaponData[i];

        // Make a new row and push them into the list
        let row = [];

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Range"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        row.push(getValueFromDatabaseRow(weaponRow, "Command ATB"));
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));

        elemental.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, elemental);

    tableCreate(elemental.length, elemental[0].length, elemental, header);
}

function printWeaponMateria(elemMateria, header) {
    readDatabase();
    let materia = [["Weapon Name", "Char", "Materia Slot 1", "Materia Slot 2", "Materia Slot 3"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Character", activeChars);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "GachaType", activeWeaponTypes);
    filteredWeaponData = getWeaponsWithMateriaMatchingFilter(filteredWeaponData, elemMateria);
    for (var i = 0; i < filteredWeaponData.length; i++) {
        var weaponRow = filteredWeaponData[i];
        
        let row = [];
        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "MateriaSupport0"));
        row.push(getValueFromDatabaseRow(weaponRow, "MateriaSupport1"));
        row.push(getValueFromDatabaseRow(weaponRow, "MateriaSupport2"));
        materia.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, materia);

    tableCreate(materia.length, materia[0].length, materia, header);
}

function printWeaponEffect(effect, header, includePot, includeMaxPot, includeDuration, includeEffectCount) {
    readDatabase();

    let effectTable = [["Weapon Name", "Character","Range", "Pot", "Max Pot", "Duration (s)", "Extension (s)", "ATB", "Uses", "Effect Count", "Type","Condition", "Equipment Type"]];
    if (!includePot)
    {
        effectTable[0].splice(effectTable[0].indexOf("Pot"), 1);
    }
    if (!includeMaxPot)
    {
        effectTable[0].splice(effectTable[0].indexOf("Max Pot"), 1);
    }
    if (!includeDuration)
    {
        effectTable[0].splice(effectTable[0].indexOf("Duration (s)"), 1);
    }
    if (!includeEffectCount)
    {
        effectTable[0].splice(effectTable[0].indexOf("Effect Count"), 1);
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
        var effectCount = "";

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
                effectCount = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_EffectCount");
            }
        }

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(effectRange);
        if (includePot)
        {
            row.push(effectPot);
        }
        if (includeMaxPot)
        {
            row.push(effectPotMax);
        }
        if (includeDuration)
        {
            row.push(effectDuration);
        }
        row.push(effectExtend);
        row.push(getValueFromDatabaseRow(weaponRow, "Command ATB"));
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));
        if (includeEffectCount)
        {
            row.push(effectCount);
        }
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        row.push(effectCondition);
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));

        effectTable.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, effectTable);

    tableCreate(effectTable.length, effectTable[0].length, effectTable, header);
}


function printWeaponCancelEffect(header) {
    readDatabase();

    let effectTable = [["Weapon Name", "Character","Range", "Effect", "ATB", "Uses", "Type","Condition", "Equipment Type"]];

    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Character", activeChars);
    filteredWeaponData = getWeaponsMatchingFilter(filteredWeaponData, "GachaType", activeWeaponTypes);
    filteredWeaponData = getWeaponsMatchingEffectType(filteredWeaponData, "CancelEffect");
    
    for (var i = 0; i < filteredWeaponData.length; i++) {
        var weaponRow = filteredWeaponData[i];
        // Make a new row and push them into the list
        let row = [];
        // find which effectIdx we're actually interested in
        for (colIdx in weaponColIdxToEffectTypeMap)
        {
            if ("CancelEffect" == (weaponRow[colIdx]))
            {
                const effectIdx = weaponColIdxToEffectTypeMap[colIdx];
                effectDesc = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx);
                effectRange = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Range");
                effectCondition = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Condition");
            }
        }

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(effectRange);
        row.push(effectDesc);
        row.push(getValueFromDatabaseRow(weaponRow, "Command ATB"));
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        row.push(effectCondition);
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));

        effectTable.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, effectTable);

    tableCreate(effectTable.length, effectTable[0].length, effectTable, header);
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
