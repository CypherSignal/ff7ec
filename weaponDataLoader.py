#!/usr/bin/python3

import json
import argparse
import time
import csv 
import re

parser = argparse.ArgumentParser(prog='WeaponDataLoader', description='Converts FF7EC-Data into a csv file for the weapon db')
parser.add_argument('directory', help="Path to the FF7EC-Data folder containing the necessary json files.")

json_path = parser.parse_args().directory

pc_last_time = time.perf_counter()

# helper function for validating performance through dev
def print_perf_data(action_name):
    global pc_last_time
    pc_current_time = time.perf_counter()
    print(("{0}: {1:.3f}s").format(action_name, pc_current_time - pc_last_time))
    pc_last_time = pc_current_time

# helper function to load one of the jsons from MasterData
# returns a dict that maps the ID of each object to an object
def load_masterdata_json(json_file_name):
    global json_path
    # load the json
    with open(json_path + "/MasterData/gl/" + json_file_name, 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    
    # the json_data should contain an array of objects (each a dict), so iterate over them and add them to a dict
    new_dict = {}
    for data_obj in json_data:
        new_dict[data_obj["Id"]] = data_obj
    return new_dict

# helper function to load the SkillEffectGroup data
# returns a dict that returns dict mapping SkillGroupId to an array of SkillEffectIds
def load_skill_effect_group_json():
    global json_path
    # load the json
    with open(json_path + "/MasterData/gl/SkillEffectGroup.json", 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    
    # the json_data should contain an array of objects 
    # ...but the output has to be a dict of arrays
    new_dict = {}
    for data_obj in json_data:
        group_id = data_obj["Id"]
        if not group_id in new_dict:
            new_dict[group_id] = []
        new_dict[group_id].append(data_obj["SkillEffectId"])
    return new_dict


# helper function to load one of the jsons from MasterData
# returns a dict that maps the ID of each object to an object
def load_weapon_upgrade_skill_json():
    global json_path
    # load the json
    with open(json_path + "/MasterData/gl/WeaponUpgradeSkill.json", 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    
    # the json_data should contain an array of objects (each a dict),
    # ...but we need to create a key based on combination of WeaponId and UpgradeCount
    new_dict = {}
    for data_obj in json_data:
        new_dict[data_obj["WeaponId"] * 100 + data_obj["UpgradeCount"]] = data_obj
    return new_dict

# helper function to strip some markup tags in the text
# e.g. "Sephiroth (Original)" is actually encoded as "Sephiroth <size=80%>(Original)</size>"
strip_markup_re = re.compile("<.*?>")
def strip_markup(in_str):
    return re.sub(strip_markup_re, "", in_str)

## ----------------------------------------------------
## ----------------------------------------------------

# start the main routine here

# first load the main loc table
loc_table = {}
with open(json_path + "/Localization/en.json", 'r', encoding='utf-8') as file:
    json_data = json.load(file)
    for loc_id,loc_value in json_data.items():
        loc_table[int(loc_id)] = loc_value
print_perf_data("Load Localization")

# the loc/text table is a single dict object with IDs as strings mapping to text
# any "NameLanguageId" should map to a value in the loc_table

# load up all of the main data we need
weapon_data = load_masterdata_json("Weapon.json")
character_data = load_masterdata_json("Character.json")
materia_support_data = load_masterdata_json("MateriaSupport.json")
skill_passive_data = load_masterdata_json("SkillPassive.json")
skill_base_data = load_masterdata_json("SkillBase.json")
skill_damage_data = load_masterdata_json("SkillDamageEffect.json")
skill_status_effect_data = load_masterdata_json("SkillStatusConditionEffect.json")
skill_buffdebuff_data = load_masterdata_json("SkillBuffDebuff.json")
skill_status_change_effect_data = load_masterdata_json("SkillStatusChangeEffect.json")
skill_effectgroup_data = load_skill_effect_group_json()
weapon_upgrade_skill_data = load_weapon_upgrade_skill_json()

print_perf_data("Load masterdata")

# start transforming all of the data into our own dict of weaponId to summarized-info
out_weapons = []

for weapon_obj in weapon_data.values():
    out_weapon = {}
    
    out_weapon["Id"] = weapon_obj["Id"]
    out_weapon["Name"] = loc_table[weapon_obj["NameLanguageId"]]

    # get the character for the weapon
    character_obj = character_data[weapon_obj["CharacterId"]]
    character_name = loc_table[character_obj["NameLanguageId"]]
    out_weapon["Character"] = strip_markup(character_name)

    out_weapons.append(out_weapon)

print_perf_data("Transform weapondata")

# with all of the weapon data transformed, write it out to csv

with open('weaponData-Staging.csv', 'w', newline='', encoding='utf-8') as csvfile:
    csv_header = [
        "Id",
        "Name",
        "Character",
    ]

    csv_writer = csv.DictWriter(csvfile, csv_header, delimiter=',')
    
    for out_weapon in out_weapons:
        csv_writer.writerow(out_weapon)

print_perf_data("Output csv")
