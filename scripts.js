// python -m http.server

/* Trash code - Need to clean up and add comments and stuff*/
/* When the user clicks on the button, toggle between hiding and showing the dropdown content */

const FILE_NAME = 'weaponData.tsv'
const ELEM_TABL_COL = 9;   
const STATUS_TABL_COL = 9;
const MATERIA_TABL_COL = 8;
const UNIQUE_TABL_COL = 12;

let weaponColHeaders = []; // array of strings for the column headers
let weaponColIndexMap = new Map(); // map of column names to column indices
let weaponColIdxToEffectMap = new Map(); // cached map of column indices to "EffectX" columns
let weaponColIdxToEffectTypeMap = new Map(); // cached map of column indices to "EffectX_Type" columns
let weaponData = []; // core weapon data; array of array of strings
let activeWeaponFilter = "";

let activeDataTables = []; // list of datatables that are currently instantiated

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
function tableCreate(tableClass, columns, tableData, header) {
    let perfTableCreateStart = performance.now();

    //body reference 
    var body = document.getElementById('Output'); 

    // header
    const h1 = document.createElement("h1"); 
    const textNode = document.createTextNode(header);
    h1.className = "weaponHeader";
    h1.appendChild(textNode);
    body.appendChild(h1);

    // console.log("Table Data:", list);
  
    // create <table> element for the dataTable to possess
    var tbl = document.createElement("table");

    // if we're showing the full ability description, we need a different table class
    if (document.getElementById("show_full_ability").checked)
    {
        tableClass = "abilityDescTable";
    }

    tbl.className = tableClass + " cell-border display compact hover order-column stripe";

    let tblId = tableClass + Math.random().toString(36).substr(2, 9); // Generate a unique ID for each table
    tbl.id = tblId;

    // put <table> in the <body>
    body.appendChild(tbl);
    let perfTableCreateEnd = performance.now();

    // Add a column def to convert the '\n' into <li> tags for the description
    let tableColumnDefs = []
    tableColumnDefs.push({
            render: function (data, type, row) {
                if (typeof data === 'string')
                {
                    return data.replaceAll("\\n", '<li>').replaceAll("{", '<b>(').replaceAll("}", ')</b>');
                }
                else
                {
                    return data;
                }
                },
            targets: "_all"
        });

    if(!document.getElementById("show_full_ability").checked)
    {
        tableColumnDefs.push({ visible: false, targets: columns.indexOf("Ability Description"), });
    }
    else
    {
        // show_full_ability is checked, so hide every column except the ability desc
        columnsToHide = []
        for (let colIdx = 0; colIdx < columns.length; ++colIdx)
        {
            if (columns[colIdx] != "Weapon Name" &&
                columns[colIdx] != "Character" &&
                columns[colIdx] != "Equipment Type" &&
                columns[colIdx] != "Ability Description")
            {
                columnsToHide.push(colIdx);
            }
        }
        tableColumnDefs.push({visible: false, targets: columnsToHide});
    }
    
    let dataTableColumns = [];
    for (let colIdx = 0; colIdx < columns.length; ++colIdx)
    {
        dataTableColumns.push({title: columns[colIdx]});
    }

    let table = new DataTable('#' + tblId, {
        columns: dataTableColumns,
        data: tableData,
        paging: false,
        columnDefs: tableColumnDefs,
        autoWidth: false,
        // hide datatables' search, and use our own
        layout: {
            topStart: null,
            topEnd: null,
            bottomStart: null,
            bottomEnd: null,
        },
    });
    activeDataTables.push(table);

    let perfDataTableCreateEnd = performance.now();

    console.log("Created table: " + tableClass);
    
    reportPerf([
        ["DOM setup", perfTableCreateStart, perfTableCreateEnd],
        ["Datatable init", perfTableCreateEnd, perfDataTableCreateEnd]
    ]);
}

// Lighter-weight refresh of all active tables. Retains the existing data and sort, but just updates search and fitler values
function refreshTableFilter()
{
    resetPerfReport();
    updateActiveDataTablesFilter();
}

function updateActiveDataTablesFilter() {
    let start = performance.now();
    
    const searchTextBox = document.getElementById("search_field");
    const activeChars = getActiveCharacterFilter();
    const activeWeaponTypes = getActiveWeaponTypeFilter();
    for (var tableIdx = 0; tableIdx < activeDataTables.length; ++tableIdx) {
        let dataTable = activeDataTables[tableIdx];
        // apply the general text search
        dataTable.search(searchTextBox.value);
        
        // charactercolumn and weaponType columns are common across all tables
        // (generalizing this involves a lot of expensive queries into the dataTable module)
        let chararacterColIdx = 1;
        let weaponTypeColIdx = 2;
        
        // Set up the search for the character and weapontype columns
        if (activeChars.length > 0)
        {
            dataTable.column(chararacterColIdx).search(str => activeChars.includes(str));
        }
        else
        {
            dataTable.column(chararacterColIdx).search("");
        }
        
        if (activeWeaponTypes.length > 0)
        {
            dataTable.column(weaponTypeColIdx).search(str => activeWeaponTypes.includes(str));
        }
        else
        {
            dataTable.column(weaponTypeColIdx).search("");
        }

        // All columns in this table are updated, so re-adjust them now
        dataTable.draw();
    }
    
    let end = performance.now();
    reportPerf([
        ["Table filter", start, end]
    ]);
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
    const weaponFilterElements = document.getElementsByName("equipment_filter");

    for (const weaponFilterElement of weaponFilterElements)
    {
        if (weaponFilterElement.checked)
        {
            weaponFilters.push(weaponFilterElement.value);
        }
    }

    return weaponFilters;
}

function addAbilityTextToTable(weaponData, outputTableColumns, outputTable)
{
    outputTableColumns.push("Ability Description");
    let colIdxToFetch = weaponColIndexMap["Ability Text"];

    for (var i = 0; i < weaponData.length; i++) {
        let weaponRow = weaponData[i];
        outputTable[i].push(weaponRow[colIdxToFetch]);
    }
}

function refreshTable()
{
    resetPerfReport();
    console.log ("Refreshing table with filter \"" + activeWeaponFilter + "\"");

    // clear the table(s) that may be there already
    var divToPrint = document.getElementById('Output');
    divToPrint.innerHTML = ''
    activeDataTables = []

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
            printWeaponEffect("MATK Down", "Equipment with Debuff MATK:", true, true, true, false);
            break;
        case "DebuffPdef":
            printWeaponEffect("PDEF Down", "Equipment with Debuff PDEF:", true, true, true, false );
            printWeaponEffect("Status Ailment: Single-Tgt. Phys. Dmg. Rcvd. Up", "Equipment with Single-Tgt. Phys. Dmg. Rcvd. Up:", true, false, true, false);
            break;
        case "DebuffMdef":
            printWeaponEffect("MDEF Down", "Equipment with Debuff MDEF:", true, true, true, false);
            printWeaponEffect("Status Ailment: Single-Tgt. Mag. Dmg. Rcvd. Up", "Equipment with Single-Tgt. Mag. Dmg. Rcvd. Up:", true, false, true, false);
            break;
        case "DebuffPatk":
            printWeaponEffect("PATK Down", "Equipment with Debuff PATK:", true, true, true, false);
            break;
        case "BuffMatk":
            printWeaponEffect("MATK Up", "Equipment with Buff MATK:", true, true, true, false);
            printWeaponEffect("Mag. Damage Bonus", "Equipment with Mag. Damage Bonus:", true, false, true, false);
            printWeaponEffect("Mag. Weapon Boost", "Equipment with Mag. Weapon Boost:", true, false, true, false);
            printWeaponEffect("Amp. Mag. Abilities", "Equipment with Amp. Mag. Abilities:", true, false, true, true);
            break;
        case "BuffPdef":
            printWeaponEffect("PDEF Up", "Equipment with Buff PDEF:",true, true, true, false);
            printWeaponEffect("Physical Resistance Increased", "Equipment with Physical Resistance Increased:",true, false, true, false);
            break;
        case "BuffMdef":
            printWeaponEffect("MDEF Up", "Equipment with Buff MDEF:", true, true, true, false);
            printWeaponEffect("Magic Resistance Increased", "Equipment with Magic Resistance Increased:", true, false, true, false);
            break;
        case "BuffPatk":
            printWeaponEffect("PATK Up", "Equipment with Buff PATK:", true, true, true, false);
            printWeaponEffect("Phys. Damage Bonus", "Equipment with Phys. Damage Bonus:", true, false, true, false);
            printWeaponEffect("Phys. Weapon Boost", "Equipment with Phys. Weapon Boost:", true, false, true, false);
            printWeaponEffect("Amp. Phys. Abilities", "Equipment with Amp. Phys. Abilities:",true, false, true, true);
            break;
        case "BuffWex":
            printWeaponEffect("Exploit Weakness", "Equipment with Exploit Weakness:",true, false, true, false);
            printWeaponEffect("Enliven", "Equipment with Enliven:",false, false, true, false);
            printWeaponEffect("Status Ailment: Enfeeble", "Equipment with Enfeeble:",false, false, true, false);
            printWeaponEffect("Applied Stats Buff Tier Increased", "Equipment with Buff Enhancement:", true, true, false, false);
            printWeaponEffect("Applied Stats Debuff Tier Increased", "Equipment with Debuff Enhancement:", true, true, false, false);
            break;
        case "Heal":
            printWeaponElem("Heal", "Non-Regen Healing Weapon (> 25% Potency):");
            printWeaponMateria("All (Cure", "Equipment with All (Cure) Materia Slot:");
            printWeaponMateria("All (Esuna",  "Equipment with All (Esuna) Materia Slot:");
            printWeaponEffect("HP Gain", "Equipment with HP Gain", true, false, true, false);
            printWeaponCancelEffect("Equipment with Remove Effect");
            break;
        case "Provoke":
            printWeaponEffect("Provoke", "Equipment with Provoke:", false, false, true, false);
            printWeaponEffect("Veil", "Equipment with Veil:", true, false, true, false);
            break;
        case "SigilCircle":
            printWeaponMateria("Circle", "Equipment with ◯ Sigil Materia Slot:");
            printWeaponSigil("◯ Circle", "Equipment with ◯ Sigil Materia on Ability:");
            break;
        case "SigilCross":
            printWeaponMateria("Cross", "Equipment with ✕ Sigil Materia Slot:");
            printWeaponSigil("✕ Cross", "Equipment with ✕ Sigil Materia on Ability:");
            break;
        case "SigilTriangle":
            printWeaponMateria("Triangle", "Equipment with △ Sigil Materia Slot:");
            printWeaponSigil("△ Triangle", "Equipment with △ Sigil Materia on Ability:");
            break;
        case "SigilDiamond":
            printWeaponSigil("◊ Diamond", "Equipment with ◊ Sigil Materia on Ability:");
            break;
        case "TimeEffect":
            printWeaponEffect("Haste", "Equipment with Haste Effect:", false, false, true, false);
            printWeaponEffect("Status Ailment: Stop", "Equipment with Stop Effect:", false, false, true, false);
            printWeaponEffect("Status Ailment: Stun", "Equipment with Stun Effect:", false, false, true, false);
            printWeaponEffect("Status Ailment: Torpor", "Equipment with Torpor Effect (Tgt. Dmg. Rcvd. Up & Stun):", true, false, true, false);
            printWeaponEffect("Status Ailment: Silence", "Equipment with Silence Effect:", true, false, true, false);
            printWeaponEffect("Status Ailment: Poison", "Equipment with Poison Effect:", true, false, true, false);
            break;
        case "GaugeEffect":
            printWeaponEffect("Increases Limit Gauge", "Equipment with Increase Limit Gauge Effect:", true, false, false, false);
            printWeaponEffect("Increases Summon Gauge", "Equipment with Increase Summon Gauge Effect:", true, false, false, false);
            printWeaponEffect("Increases Command Gauge", "Equipment with Increase Command Gauge Effect:", true, false, false, false);
            printWeaponEffect("Increases Overspeed Gauge", "Equipment with Increase Overspeed Gauge Effect:", true, false, false, false);
            printWeaponEffect("ATB+", "Equipment with ATB Bonus:", true, false, false, false);
            printWeaponEffect("Phys. ATB Conservation Effect", "Equipment with Phys. ATB Conservation Effect:",true, false, true, false);
            printWeaponEffect("Mag. ATB Conservation Effect", "Equipment with Mag. ATB Conservation Effect:", true, false, true, false);
            printWeaponEffect("Gain Extra Use of Gear C. Ability", "Equipment with Gear C. Ability Bonus:", true, false, false, false);
            break;
        case "All":
            printAllWeapon("", "List of All Weapons:");
            break;
    }
    updateActiveDataTablesFilter();
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

function filterTimeEffect() {
    activeWeaponFilter = "TimeEffect";
    refreshTable();
}

function filterGaugeEffect() {
    activeWeaponFilter = "GaugeEffect";
    refreshTable();
}

function filterAll() {
    activeWeaponFilter = "All";
    refreshTable();
}

function printElemWeapon(elem) {
    document.getElementById("ecDropdown").classList.remove("show");

    var header = "Equipment with C-Abilities - " + elem;
    printWeaponElem(elem, header);

    if (elem != "Non-Elemental") {
        printWeaponEffect(elem + " Resistance Down",               "Equipment with " + elem + " Resistance Down:",true, true, true, false);
        printWeaponEffect(elem + " Damage Up",                     "Equipment with " + elem + " Damage Up:",true, true, true, false);
        printWeaponEffect(elem + " Damage Bonus",                  "Equipment with " + elem + " Damage Bonus:",true, false, true, false);
        printWeaponEffect(elem + " Weapon Boost",                  "Equipment with " + elem + " Weapon Boost:", true, false, true, false);
        printWeaponEffect("Status Ailment: " + elem + " Weakness", "Equipment with " + elem + " Weakness:",true, false, true, false);
        printWeaponEffect(elem + " Resistance Up",                 "Equipment with " + elem + " Resistance Up:", true, true, true, false);
        printWeaponEffect(elem + " Damage Down",                   "Equipment with " + elem + " Damage Down:", true, true, true, false);
        
        printWeaponMateria(elem, "Equipment with " + elem + " Materia Slot:");
    }
}

function printAllWeapon(elem, header) {
    let columns = ["Weapon Name", "Character", "Equipment Type", "AOE", "Type", "ATB", "Element", "Pot%", "Max%", "% per ATB", "Condition", "Dmg. Customization"];
    let tableData = []

    let filteredWeaponData = weaponData; 
    for (var i = 0; i < weaponData.length; i++) {
        let weaponRow = weaponData[i];

        // Make a new row and push them into the list
        let row = [];

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));
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
        var customization = "";
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
                var addlEffectCustom = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Custom");
                if (addlEffectCustom != "")
                {
                    condition = "{" + addlEffectCustom + " Customization} " + condition;
                } 
            }
            else if (weaponRow[colIdx] == "DamageEffect") // alternate damage effect -- should be from a Customization
            {
                var effectIdx = weaponColIdxToEffectTypeMap[colIdx];
                const customizationType = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Custom");
                const customizationBody = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx);
                customization = "{" + customizationType + " Customization} " + customizationBody;
            }
        }
        row.push(pot);
        row.push(maxPot);
        row.push((maxPot / Math.max(atb,1)).toFixed(0));
        row.push(condition);
        row.push(customization);

        tableData.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, columns, tableData);

    tableCreate("uniqueTable", columns,  tableData, header);
}


function printWeaponElem(elem, header) {
    let columns = ["Weapon Name", "Character",  "Equipment Type", "Range", "Type", "ATB", "Uses", "Pot%", "Max Pot%", "% per ATB", "Condition for Max", "Dmg. Customization"];
    let tableData = []

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Ability Element", elem);

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
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));
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
        var customization = "";
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
                var addlEffectCustom = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Custom");
                if (addlEffectCustom != "")
                {
                    condition = "{" + addlEffectCustom + " Customization} " + condition;
                } 
            }
            else if (weaponRow[colIdx] == "DamageEffect") // alternate damage effect -- should be from a Customization
            {
                var effectIdx = weaponColIdxToEffectTypeMap[colIdx];
                const customizationType = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Custom");
                const customizationBody = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx);
                customization = "{" + customizationType + " Customization} " + customizationBody;
            }
        }
        row.push(pot);
        row.push(maxPot);
        row.push((maxPot / Math.max(atb,1)).toFixed(0));
        row.push(condition);
        row.push(customization);

        tableData.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, columns, tableData);

    tableCreate("elemTable",  columns, tableData, header);
}

function printWeaponSigil(sigil, header) {
    let columns = ["Weapon Name", "Character",  "Equipment Type", "Range", "Type", "ATB", "Uses"];
    let tableData = []

    let filteredWeaponData = getWeaponsMatchingFilter(weaponData, "Command Sigil", sigil);

    for (var i = 0; i < filteredWeaponData.length; i++) {
        let weaponRow = filteredWeaponData[i];

        // Make a new row and push them into the list
        let row = [];

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Range"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        row.push(getValueFromDatabaseRow(weaponRow, "Command ATB"));
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));

        tableData.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, columns, tableData);

    tableCreate("sigilTable", columns, tableData, header);
}

function printWeaponMateria(elemMateria, header) {
    let columns = ["Weapon Name", "Character", "Equipment Type",  "Materia Slot 1", "Materia Slot 2", "Materia Slot 3"];
    let tableData = []

    let filteredWeaponData = getWeaponsWithMateriaMatchingFilter(weaponData, elemMateria);
    for (var i = 0; i < filteredWeaponData.length; i++) {
        var weaponRow = filteredWeaponData[i];
        
        let row = [];
        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));
        row.push(getValueFromDatabaseRow(weaponRow, "MateriaSupport0"));
        row.push(getValueFromDatabaseRow(weaponRow, "MateriaSupport1"));
        row.push(getValueFromDatabaseRow(weaponRow, "MateriaSupport2"));
        tableData.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, columns, tableData);

    tableCreate("materiaTable", columns, tableData, header);
}

function printWeaponEffect(effect, header, includePot, includeMaxPot, includeDuration, includeEffectCount) {
    let columns = ["Weapon Name", "Character", "Equipment Type", "Range"];
    let tableData = []
    
    if (includePot)
    {
        columns.push("Pot.");
    }
    if (includeMaxPot)
    {
        columns.push("Max Pot.");
    }
    if (includeDuration)
    {
        columns.push("Dur. (s)");
    }
    columns.push("Ext. (s)");
    if (includeEffectCount)
    {
        columns.push("Effect Count");
    }
    columns.push("ATB", "Uses",  "Type", "Condition", "Req. Customization");
    let filteredWeaponData = getWeaponsMatchingEffect(weaponData, effect);
    
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
        var effectCustomization = "";

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
                effectCustomization = getValueFromDatabaseRow(weaponRow, "Effect" + effectIdx + "_Custom");
            }
        }

        row.push(getValueFromDatabaseRow(weaponRow, "Name"));
        row.push(getValueFromDatabaseRow(weaponRow, "Character"));
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));
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
        if (includeEffectCount)
        {
            row.push(effectCount);
        }
        row.push(getValueFromDatabaseRow(weaponRow, "Command ATB"));
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        row.push(effectCondition);
        row.push(effectCustomization);

        tableData.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, columns, tableData);

    tableCreate("effectTable", columns, tableData, header);
}


function printWeaponCancelEffect(header) {
    let columns = ["Weapon Name", "Character", "Equipment Type","Range", "Effect", "ATB", "Uses", "Type","Condition"];
    let tableData = []

    let filteredWeaponData = getWeaponsMatchingEffectType(weaponData, "CancelEffect");
    
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
        row.push(getValueFromDatabaseRow(weaponRow, "GachaType"));
        row.push(effectRange);
        row.push(effectDesc);
        row.push(getValueFromDatabaseRow(weaponRow, "Command ATB"));
        row.push(getValueFromDatabaseRow(weaponRow, "Use Count"));
        row.push(getValueFromDatabaseRow(weaponRow, "Ability Type"));
        row.push(effectCondition);

        tableData.push(row);
    }
    addAbilityTextToTable(filteredWeaponData, columns, tableData);

    tableCreate("effectTable", columns, tableData, header);
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
