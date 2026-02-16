// python -m http.server

/* Trash code - Need to clean up and add comments and stuff*/
/* When the user clicks on the button, toggle between hiding and showing the dropdown content */

const FILE_NAME = 'weaponData-Staging.tsv'
const ELEM_TABL_COL = 9;   
const STATUS_TABL_COL = 9;
const MATERIA_TABL_COL = 8;
const UNIQUE_TABL_COL = 12;
const MAX_POT_INDEX = 6;   // Index into the maxPot for sorting
let weaponDatabase = [];
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
    if (weaponDatabase[0] != null) {
        return;
    }
    resetPerfReport();
    let start = performance.now();

    var location = window.location.href;
    var directoryPath = location.substring(0, location.lastIndexOf("/") + 1);
    result = loadFile(directoryPath + FILE_NAME);

    if (result != null) {
        // By lines
        var lines = result.split('\n');

        // mapping of our database column names to the TSV Column names that we want
        var dbColsToTsvColsMap = new Map([
            ['name', 'Name'],
            ['charName', 'Character'],
            ['sigil', 'Command Sigil'],
            ['atb', 'Command ATB'],
            ['type', 'Ability Type'],
            ['element', 'Ability Element'],
            ['range', 'Ability Range'],
            ['potOb10', 'Ability Pot. %'],
            // ['maxPotOb10',
            ['effect1Range',  'Effect0_Range'],
            ['effect1',       'Effect0'],
            ['effect1Pot',    'Effect0_Pot'],
            ['effect1MaxPot', 'Effect0_PotMax'],
            ['effect1Dur',    'Effect0_Dur'],
            ['condition1',    'EFfect0_Condition'],
            ['effect2Range'  , 'Effect1_Range'],
            ['effect2'       , 'Effect1'],
            ['effect2Pot'    , 'Effect1_Pot'],
            ['effect2MaxPot' , 'Effect1_PotMax'],
            ['effect2Dur'    , 'Effect1_Dur'],
            ['condition2'    , 'EFfect1_Condition'],
            ['effect3Range'  ,'Effect2_Range'],
            ['effect3'       ,'Effect2'],
            ['effect3Pot'    ,'Effect2_Pot'],
            ['effect3MaxPot' ,'Effect2_PotMax'],
            ['effect3Dur'    ,'Effect2_Dur'],
            ['condition3'    ,'EFfect2_Condition'],
            // ['support1' 
            // ['support2' 
            // ['support3' 
            // ['rAbility1'
            // ['rAbility2'
            // ['uses'
            ['gachaType', 'GachaType'],
        ])

        // generate an array of indices for the Tsv's columns, so we can directly load them into weapData
        let dbColAndTsvIdxs = []
        {
            var headers = TsvLineToArray(lines[0]);
            for (const [dbCol, tsvCol] of dbColsToTsvColsMap) {
                let tsvIdx = headers.indexOf(tsvCol);
                dbColAndTsvIdxs.push([dbCol, tsvIdx]);
            }
        }

        for (var line = 1; line < lines.length-1; line++) {

            var row = TsvLineToArray(lines[line]);
            var i = 0;
            let weapData = [];

            for (var col = 0; col < dbColAndTsvIdxs.length; col++) {
                weapData.push({ name: dbColAndTsvIdxs[col][0], value:row[dbColAndTsvIdxs[col][1]]});
            }
            weaponDatabase.push(weapData);
            // console.log(weapData);
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
function getValueFromDatabaseItem(item, name) {
    var i = findElement(item, "name", name);
    if (i != null)
        return i["value"];
    else
        return null;
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

function matchWeaponByCharacter(weapon, charFilters)
{
    // no char filter, then they're always a match
    if (charFilters.length == 0)
    {
        return true;
    }

    // locate the charName element, and see if it matches any of the charFilters
    return charFilters.includes(getValueFromDatabaseItem(weapon, "charName"));
}

function matchWeaponByType(weapon, weaponTypeFilters)
{
    // no active filter, then they're always a match
    if (weaponTypeFilters.length == 0)
    {
        return true;
    }

    let weaponType = "";
    if (getValueFromDatabaseItem(weapon, "uses") != "No Limit")
    {
        weaponType = "Ultimate";
    }
    else
    {
        switch (getValueFromDatabaseItem(weapon, "gachaType"))
        {
            case "L": weaponType = "Limited"; break;
            case "Y": weaponType = "Event"; break;
            case "N": weaponType = "Featured"; break;
        }
    }
    return weaponTypeFilters.includes(weaponType);
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
    var elemResist, elemEnchant, elemMateria;

    if (elem == "Lightning") {
        elemResist = "[Resist] Thunder"; // For whatever reseaon, Lightning resist is listed as "[Resist] Thunder";
        elemEnchant = "[Enchant] Thunder";
        elemMateria = "Light";
    }
    else {
        elemResist = "[Resist] " + elem;
        elemEnchant = "[Enchant] " + elem;
        elemMateria = elem;
    }

    var header = "Weapon with C-Abilities - " + elem;
    printWeaponElem(elem, header);

    if (elem != "None") {
        header = "Weapon with [Debuff] " + elem + " Resist Down:";
        printWeaponEffect(elemResist, header);

        header = "Weapon with [Buff] " + elem + " Damage Up:";
        printWeaponEffect(elemEnchant, header);

        header = "Weapon with " + elem + " Materia Slot:";
        printWeaponMateria(elemMateria, header);
    }
}

function printLimitedWeapon(elem, header) {
    readDatabase();
    let elemental;
    elemental = [["Weapon Name", "Char", "AOE", "Type", "ATB", "Element", "Pot%", "Max%", "% per ATB", "Condition"]];

    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    for (var i = 0; i < weaponDatabase.length; i++) {
        var found = findWeaponWithProperty(weaponDatabase[i], 'gachaType', "L");
        found = found && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);

        if (found) {
            // Make a new row and push them into the list
            let row = [];

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "range"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));

            var atb = getValueFromDatabaseItem(weaponDatabase[i], "atb");
            row.push(atb);

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "element"));
 
            var pot, maxPot;

            pot = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "potOb10"));
            row.push(pot);

            maxPot = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "maxPotOb10"));
            row.push(maxPot);

            // % per ATB
            if (atb != 0) {
                row.push((maxPot / atb).toFixed(0));
            }
            else {
                row.push(maxPot);
            }

            if (elem != "Heal") {
                // @todo: Need to figure out a good way to deal with this stupid weapon
                if ((maxPot > pot) || (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Bahamut Greatsword") ||
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Sabin's Claws") || 
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Blade of the Worthy") || 
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Umbral Blade")) {
                    // Check to see if DMG+ Condition is from Effect1 or Effect2 
                    if (findWeaponWithProperty(weaponDatabase[i], 'effect1', "DMG")) {
                        row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition1"));
                    }
                    else {
                        row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition2"));
                    }
                }
                else {
                    row.push("");
                }
            }

            elemental.push(row);
        }

        elemental.sort(elementalCompare);
    }

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

        found = found && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);

        if (found) {
            // Make a new row and push them into the list
            let row = [];

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "range"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));

            var atb = getValueFromDatabaseItem(weaponDatabase[i], "atb");
            row.push(atb);

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "element"));

            var pot, maxPot;

            pot = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "potOb10"));
            row.push(pot);

            maxPot = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "maxPotOb10"));
            row.push(maxPot);

            // % per ATB
            if (atb != 0) {
                row.push((maxPot / atb).toFixed(0));
            }
            else {
                row.push(maxPot);
            }

            type = getValueFromDatabaseItem(weaponDatabase[i], "gachaType");
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
                if ((maxPot > pot) || (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Bahamut Greatsword") ||
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Sabin's Claws") ||
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Blade of the Worthy") ||
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Umbral Blade")) {
                    // Check to see if DMG+ Condition is from Effect1 or Effect2 
                    if (findWeaponWithProperty(weaponDatabase[i], 'effect1', "DMG")) {
                        row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition1"));
                    }
                    else {
                        row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition2"));
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
    let elemental;
    if (elem != "Heal") {
        elemental = [["Weapon Name", "Char", "AOE", "Type", "ATB", "Uses", "Pot%", "Max%", "% per ATB", "Condition"]];
    }
    else {
        elemental = [["Weapon Name", "Char", "AOE", "Type", "ATB", "Uses", "Target", "Pot%", "Max%", "% per ATB"]];
    }

    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    for (var i = 0; i < weaponDatabase.length; i++) {
        var found = findWeaponWithProperty(weaponDatabase[i], 'element', elem);

        found = found && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);

        if (found) {
            if (elem == "Heal") {
                // Low % heal is not worth it - set threshold at 50
                if (parseInt(getValueFromDatabaseItem(weaponDatabase[i], "potOb10")) < 25)
                    continue;
            }

            // Make a new row and push them into the list
            let row = [];

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "range"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));

            var atb = getValueFromDatabaseItem(weaponDatabase[i], "atb");
            row.push(atb);

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "uses"));

            if (elem == "Heal") {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Target"));
            }

            var pot, maxPot;            

            pot = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "potOb10"));
            row.push(pot);

            maxPot = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "maxPotOb10"));
            row.push(maxPot);

            // % per ATB
            if (atb != 0) {
                row.push((maxPot / atb).toFixed(0));
            }
            else {
                row.push(maxPot);
            }

            if (elem != "Heal") {
                // @todo: Need to figure out a good way to deal with this stupid weapon
                if ((maxPot > pot) || (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Bahamut Greatsword") ||
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Sabin's Claws") ||
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Blade of the Worthy") ||
                    (getValueFromDatabaseItem(weaponDatabase[i], "name") == "Umbral Blade")) {
                    // Check to see if DMG+ Condition is from Effect1 or Effect2 
                    if (findWeaponWithProperty(weaponDatabase[i], 'effect1', "DMG")) {
                        row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition1"));
                    }
                    else {
                        row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition2"));
                    }
                }
                else {
                    row.push("");
                }
            }

            elemental.push(row);
        }

        elemental.sort(elementalCompare);
    }

    tableCreate(elemental.length, elemental[0].length, elemental, header);
}


function printWeaponSigil(sigil, header) {
    readDatabase();
    let materia = [["Weapon Name", "Char", "AOE", "Type", "Elem", "ATB", "Uses", "Pot%", "Max%"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();

    for (var i = 0; i < weaponDatabase.length; i++) {
        var found = findWeaponWithProperty(weaponDatabase[i], 'sigil', sigil);
        found = found && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);

        if (found) {
            let row = [];
            
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "range"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "element"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "atb"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "uses"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "potOb10"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "maxPotOb10"));

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
        found = found || findWeaponWithProperty(weaponDatabase[i], 'support1', elemMateria);
        found = found || findWeaponWithProperty(weaponDatabase[i], 'support2', elemMateria);
        found = found || findWeaponWithProperty(weaponDatabase[i], 'support3', elemMateria);
        found = found && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);

        if (found) {

            let row = [];
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "range"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "element"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "atb"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "uses"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "potOb10"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "maxPotOb10"));

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
        var found = findWeaponWithProperty(weaponDatabase[i], 'element', "Heal");
        var found1 = found && findWeaponWithProperty(weaponDatabase[i], 'effect1', text);
        var found2 = found && findWeaponWithProperty(weaponDatabase[i], 'effect2', text);
        found = (found1 || found2) && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);

        if (found) {
            // Make a new row and push them into the list
            let row = [];

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));

            var atb = getValueFromDatabaseItem(weaponDatabase[i], "atb");
            row.push(atb);

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "uses"));

            var dur, pot, maxPot;

            if (found1) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Range"));
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Range"));
            }
            if (found1) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Target"));

                dur = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "effect1Dur"));
                row.push(dur);               
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Target"));

                dur = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "effect2Dur"));
                row.push(dur);
            }

            pot = parseInt(getValueFromDatabaseItem(weaponDatabase[i], "potOb10"));
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

function printWeaponEffect(text, header) {
    readDatabase();
    let effect = [["Name", "Char", "Type", "Elem", "ATB", "Uses", "AOE", "Target", "Pot", "Max Pot", "Duration (s)", "Condition"]];  
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();
    
    for (var i = 0; i < weaponDatabase.length; i++) {
        var found1 = findWeaponWithProperty(weaponDatabase[i], 'effect1', text);
        var found2 = findWeaponWithProperty(weaponDatabase[i], 'effect2', text);
        var found3 = findWeaponWithProperty(weaponDatabase[i], 'effect3', text);
        var found = (found1 || found2 || found3);
        found = found && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);
        
        if (found) {
            // Make a new row and push them into the list
            let row = [];

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "element"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "atb"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "uses"));

            if (found1) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Range"));
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Range"));
            }
            else if (found3) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Range"));
            }
            if (found1) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Target"));  
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Pot"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1MaxPot"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Dur"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition1"));
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Target"));  
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Pot"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2MaxPot"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Dur"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition2"));
            }
            else if (found3) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect3Target"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect3Pot"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect3MaxPot"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect3Dur"));
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition3"));
            }

            effect.push(row);
        }
    }

    tableCreate(effect.length, effect[0].length, effect, header);
}

function printWeaponUniqueEffect(text, header) {
    readDatabase();
    let effect = [["Name", "Char", "AOE", "Type", "Elem", "ATB", "Uses", "Target1", "Effect1", "Condition1", "Target2", "Effect2", "Condition2"]];
    let activeChars = getActiveCharacterFilter();
    let activeWeaponTypes = getActiveWeaponTypeFilter();
    
    for (var i = 0; i < weaponDatabase.length; i++) {
        var found1 = findWeaponWithProperty(weaponDatabase[i], 'effect1', text);
        var found2 = findWeaponWithProperty(weaponDatabase[i], 'effect2', text);
        var found = (found1 || found2);
        found = found && matchWeaponByCharacter(weaponDatabase[i], activeChars);
        found = found && matchWeaponByType(weaponDatabase[i], activeWeaponTypes);
        if (found) {
            let row = [];

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "name"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "charName"));
            if (found1) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Range"));
            }
            else if (found2) {
                row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Range"));
            }

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "type"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "element"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "atb"));
            row.push(getValueFromDatabaseItem(weaponDatabase[i], "uses"));

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect1Target"));
            var str = getValueFromDatabaseItem(weaponDatabase[i], "effect1");
            var indexOfFirst = str.indexOf(text);
            if (indexOfFirst >= 0) {
                var newstr = str.substring(indexOfFirst + text.length + 1);
                row.push(newstr);
            }
            else {
                row.push(str);
            }

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition1"));

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "effect2Target"));

            var str = getValueFromDatabaseItem(weaponDatabase[i], "effect2");
            var indexOfFirst = str.indexOf(text);
            if (indexOfFirst >= 0) {
                var newstr = str.substring(indexOfFirst + text.length + 1);
                row.push(newstr);
            }
            else {
                row.push(str);
            }

            row.push(getValueFromDatabaseItem(weaponDatabase[i], "condition2"));


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
