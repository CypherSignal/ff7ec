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

# helper function to load "group" data
# returns a dict that returns dict mapping the "Id" to an array of other Ids, specified by 'child_id' name
def load_group_json(json_file_name, child_id):
    global json_path
    # load the json
    with open(json_path + "/MasterData/gl/" + json_file_name, 'r', encoding='utf-8') as file:
        json_data = json.load(file)

    # the json_data should contain an array of objects
    # ...but the output has to be a dict of arrays
    new_dict = {}
    for data_obj in json_data:
        group_id = data_obj["Id"]
        if not group_id in new_dict:
            new_dict[group_id] = []
        new_dict[group_id].append(data_obj[child_id])
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
character_data = load_masterdata_json("Character.json")
materia_support_data = load_masterdata_json("MateriaSupport.json")
skill_active_data = load_masterdata_json("SkillActive.json")
skill_additional_effect_data = load_masterdata_json("SkillAdditionalEffect.json")
skill_atbchange_effect_data = load_masterdata_json("SkillAtbChangeEffect.json")
skill_base_data = load_masterdata_json("SkillBase.json")
skill_buffdebuff_data = load_masterdata_json("SkillBuffDebuff.json")
skill_buffdebuff_enhance_data = load_masterdata_json("SkillBuffDebuffEnhance.json")
skill_cancel_effect_data = load_masterdata_json("SkillCancelEffect.json")
skill_effect_data = load_masterdata_json("SkillEffect.json")
skill_damage_data = load_masterdata_json("SkillDamageEffect.json")
skill_notes_data = load_masterdata_json("SkillNotes.json")
skill_notes_set_data = load_masterdata_json("SkillNotesSet.json")
skill_passive_data = load_masterdata_json("SkillPassive.json")
skill_special_gauge_change_data = load_masterdata_json("SkillSpecialGaugeChangeEffect.json")
skill_status_change_effect_data = load_masterdata_json("SkillStatusChangeEffect.json")
skill_status_effect_data = load_masterdata_json("SkillStatusConditionEffect.json")
skill_tactics_gauge_change_data = load_masterdata_json("SkillTacticsGaugeChangeEffect.json")
skill_trigger_condition_hp_data = load_masterdata_json("SkillTriggerConditionHp.json")
skill_weapon_data = load_masterdata_json("SkillWeapon.json")
weapon_data = load_masterdata_json("Weapon.json")

buffdebuff_group_data = load_group_json("BuffDebuffGroup.json", "SkillBuffDebuffType")
skill_effectgroup_data = load_group_json("SkillEffectGroup.json", "SkillEffectId")
status_condition_group_data = load_group_json("StatusConditionGroup.json", "SkillStatusConditionType")
status_change_group_data = load_group_json("StatusChangeGroup.json", "SkillStatusChangeType")

weapon_upgrade_skill_data = load_weapon_upgrade_skill_json()

# special-case the sigil effects from 'skill notes' dataset
skill_notes_sigils = {
    1101:"◯ Circle",
    2101:"△ Triangle",
    3101:"✕ Cross",
    4101:"◊ Diamond",
}

# gacha-types for the Weapon.json WeaponType
weapon_gacha_types = [
    "Featured",
    "Grindable",
    "Event",
    "Limited",
    # ultimate is not included since those are identified differently
]

# damage-types for weapon ability (for skillbase.json)
attack_types = [
    "UNKNOWN",
    "Phys",
    "Mag",
    "Both",
]

# element-types for weapon ability (for skillbase.json)
element_types = [
    "UNKNOWN",
    "None",
    "Fire",
    "Ice",
    "Lightning",
    "Earth",
    "Water",
    "Wind",
]

target_types = [
    "UNKNOWN",
    "Single Enemy",
    "All Enemies",
    "Single Ally",
    "All Allies",
    "Self",
    "Other Allies",
    "All Enemies + Allies",
]

status_effect_types = {
    1:"Poison",
    3:"Silence",
    4:"Darkness",
    5:"Stun",
    16:"Enfeeble",
    17:"Stop",
    18:"Fire Weakness",
    19:"Ice Weakness",
    20:"Lightning Weakness",
    21:"Earth Weakness",
    22:"Water Weakness",
    23:"Wind Weakness",
    27:"Single-Tgt. Phys. Dmg. Rcvd. Up",
    28:"Single-Tgt. Mat. Dmg. Rcvd. Up",
    # TODO: need to fill this out as effects come online; not sure what the mapping is
}

buffdebuff_types = {
    1: "PATK Up",
    2: "PDEF Up",
    3: "MATK Up",
    4: "MDEF Up",
    5: "PATK Down",
    6: "PDEF Down",
    7: "MATK Down",
    8: "MDEF Down",
    11: "Fire Resistance Up",
    12: "Fire Resistance Down",
    13: "Ice Resistance Up",
    14: "Ice Resistance Down",
    15: "Lightning Resistance Up",
    16: "Lightning Resistance Down",
    17: "Earth Resistance Up",
    18: "Earth Resistance Down",
    19: "Water Resistance Up",
    20: "Water Resistance Down",
    21: "Wind Resistance Up",
    22: "Wind Resistance Down",
    27: "Fire Damage Up",
    28: "Fire Damage Down",
    29: "Ice Damage Up",
    30: "Ice Damage Down",
    31: "Lightning Damage Up",
    32: "Lightning Damage Down",
    33: "Earth Damage Up",
    34: "Earth Damage Down",
    35: "Water Damage Up",
    36: "Water Damage Down",
    37: "Wind Damage Up",
    38: "Wind Damage Down",
}

buffdebuff_tiers = [
    "UNKNOWN TIER",
    "Low",
    "Mid",
    "High",
    "Extra High",
    "Extreme",
]

skilleffect_types = {
    1:"DamageEffect",
    2:"StatusConditionEffect",
    3:"BuffDebuff",
    5:"StatusChangeEffect",
    6:"CancelEffect",
    7:"AdditionalEffect",
    16:"AtbChangeEffect",
    26:"SpecialGaugeChangeEffect",
    30:"TacticsGaugeChangeEffect",
    31:"BuffDebuffEnhance",
}

special_gauge_types = [
    "UNKNOWN",
    "Limit Gauge",
    "Summon Gauge",
]

additional_skill_types = [
    "UNKNOWN",
    "Limit Gauge",
    "Summon Gauge",
]

status_change_types = {
    2:"Provoke",
    4:"Regen",
    5:"Haste",
    6:"Veil",
    8:"Physical Resistance Increased",
    9:"Magic Resistance Increased",
    10:"HP Gain",
    11:"Exploit Weakness",
    12:"Amp. Phys. Abilities",
    13:"Amp. Mag. Abilities",
    23:"Amp. Healing Abilities",
    24:"Phys. Damage Bonus",
    25:"Mag. Damage Bonus",
    26:"Fire Damage Bonus",
    27:"Ice Damage Bonus",
    28:"Lightning Damage Bonus",
    29:"Earth Damage Bonus",
    30:"Water Damage Bonus",
    31:"Wind Damage Bonus",
    34:"Phys. Weapon Boost",
    35:"Mag. Weapon Boost",
    36:"Fire Weapon Boost",
    37:"Ice Weapon Boost",
    38:"Lightning Weapon Boost",
    39:"Earth Weapon Boost",
    40:"Water Weapon Boost",
    41:"Wind Weapon Boost",
    44:"Phys. ATB Conservation Effect",
    45:"Mag. ATB Conservation Effect",
}

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

    # fetch the "Base" weapon skill (basically what we have for Ults, or OB1 version of weapon)
    weapon_is_ultimate = weapon_obj["WeaponEquipmentType"] == 1 # expected values are 0 for normal, 1 for ult
    if (weapon_is_ultimate):
        weapon_upgrade_skill_base_obj = weapon_upgrade_skill_data[weapon_obj["Id"]*100 + 0]
    else:
        weapon_upgrade_skill_base_obj = weapon_upgrade_skill_data[weapon_obj["Id"]*100 + 1]

    weapon_skill_base_id = weapon_upgrade_skill_base_obj["WeaponSkillId"]
    skill_weapon_base_obj = skill_weapon_data[weapon_skill_base_id]
    skill_base_base_obj = skill_base_data[weapon_skill_base_id]

    # save out all c.ability data that is agnostic of  weapon being ult/OB1/6/10
    out_weapon["Ability Type"] = attack_types[skill_base_base_obj["BaseAttackType"]]

    skill_effect_objs = []
    if (not weapon_is_ultimate):
        # non-ultimate weapons define ATB cost on the skill-active obj
        # (skillActive also defines use count, but only ultimates and costumes have limits right now)
        skill_active_base_obj = skill_active_data[skill_weapon_base_obj["SkillActiveId"]]
        out_weapon["Command ATB"] = skill_active_base_obj["Cost"]
        out_weapon["GachaType"] = weapon_gacha_types[weapon_obj["WeaponType"]]

        # as far as data setup goes now, SkillNotes/SkillNoteSet on player weapons appears to just be for sigil breaks
        if (skill_weapon_base_obj["SkillNotesSetId"] != 0):
            skill_notes_set_obj = skill_notes_set_data[skill_weapon_base_obj["SkillNotesSetId"]]
            out_weapon["Command Sigil"] = skill_notes_sigils[skill_notes_set_obj["SkillNotesId"]]

        # fetch the weapon skills at OB1/6/10
        weapon_upgrade_skill_obj = [
            weapon_upgrade_skill_data[weapon_obj["Id"]*100 + 1],
            weapon_upgrade_skill_data[weapon_obj["Id"]*100 + 6],
            weapon_upgrade_skill_data[weapon_obj["Id"]*100 + 10],
        ]
        skill_weapon_obj = [
            skill_weapon_data[weapon_upgrade_skill_obj[0]["WeaponSkillId"]],
            skill_weapon_data[weapon_upgrade_skill_obj[1]["WeaponSkillId"]],
            skill_weapon_data[weapon_upgrade_skill_obj[2]["WeaponSkillId"]],
        ]
        skill_active_obj = [
            skill_active_data[skill_weapon_obj[0]["SkillActiveId"]],
            skill_active_data[skill_weapon_obj[1]["SkillActiveId"]],
            skill_active_data[skill_weapon_obj[2]["SkillActiveId"]],
        ]
        skill_base_obj = [
            skill_base_data[skill_active_obj[0]["SkillBaseId"]],
            skill_base_data[skill_active_obj[1]["SkillBaseId"]],
            skill_base_data[skill_active_obj[2]["SkillBaseId"]],
        ]

        # for populating the list of skill_effect_objs, just look at the OB10 data
        skill_effectgroup_list = skill_effectgroup_data[skill_base_obj[2]["SkillEffectGroupId"]]
        for skill_effect_id in skill_effectgroup_list:
            skill_effect_objs.append(skill_effect_data[skill_effect_id])

    # ultimate weapons need some extra handling since they don't have "SkillActives", nor OB levels
    if (weapon_is_ultimate):
        out_weapon["Command ATB"] = 0
        out_weapon["GachaType"] = "Ultimate"

        skill_effectgroup_list = skill_effectgroup_data[skill_base_base_obj["SkillEffectGroupId"]]
        for skill_effect_id in skill_effectgroup_list:
            skill_effect_objs.append(skill_effect_data[skill_effect_id])

    # handle all of the skill-effects
    # first, we want to handle the damage effect very specially, so find it and take it out of the list
    skill_effect_damage_obj = None
    for idx,skill_effect_obj in enumerate(skill_effect_objs):
        if (skill_effect_obj["SkillEffectType"] == 1):
            skill_effect_damage_obj = skill_effect_obj
            skill_effect_objs.pop(idx)
            break

    # output data for the damage effect
    out_weapon["Ability Range"] = target_types[skill_effect_damage_obj["TargetType"]]
    skill_damage_effect_damage_obj = skill_damage_data[skill_effect_damage_obj["SkillEffectDetailId"]]
    if (skill_effect_damage_obj["TargetType"] >= 3 and skill_effect_damage_obj["TargetType"] <= 6 ):
        # TODO: skill_damage_effect_damage_obj["SkillHealType"] == 0 or 1 changes something?
        # Only "targets allies" determines if the attack heals or not
        out_weapon["Ability Pot. %"] = round(skill_damage_effect_damage_obj["MaxDamageCoefficient"] / 22,0)
        out_weapon["Ability Element"] = "Heal"
    else:
        out_weapon["Ability Pot. %"] = skill_damage_effect_damage_obj["MaxDamageCoefficient"] / 10
        out_weapon["Ability Element"] = element_types[skill_damage_effect_damage_obj["ElementType"]]

    # output data for each skill effect
    for skill_effect_idx,skill_effect_obj in enumerate(skill_effect_objs):
        skill_effect_suffix = str(skill_effect_idx)
        skill_effect_detail_id = skill_effect_obj["SkillEffectDetailId"]
        effect_detail_prefix = "Effect" + skill_effect_suffix
        out_weapon[effect_detail_prefix + "_Range"] = target_types[skill_effect_obj["TargetType"]]
        out_weapon[effect_detail_prefix + "_Type"] = skilleffect_types[skill_effect_obj["SkillEffectType"]]
        
        match skill_effect_obj["TriggerType"]:
            case 1: # no condition required
                pass
            case 2: 
                out_weapon[effect_detail_prefix + "_Condition"] = "When hitting critical"
            case 3:
                out_weapon[effect_detail_prefix + "_Condition"] = "When matching sigils are destroyed"
            case 4: # hp
                skill_trigger_condition_hp_obj = skill_trigger_condition_hp_data[skill_effect_obj["TriggerConditionId"]]
                if (skill_trigger_condition_hp_obj["MinPermil"] == 0):
                    out_weapon[effect_detail_prefix + "_Condition"] = "When HP is less than " + str(round(skill_trigger_condition_hp_obj["MaxPermil"]/10,0)) + "%"
                elif (skill_trigger_condition_hp_obj["MaxPermil"] == 1000):
                    out_weapon[effect_detail_prefix + "_Condition"] = "When HP is greater than " + str(round(skill_trigger_condition_hp_obj["MinPermil"]/10,0)) + "%"
                else:
                    out_weapon[effect_detail_prefix + "_Condition"] = "UNKNOWN CONDITION " + str(skill_effect_obj["TriggerType"]) + " on SkillEffectId: " + str(skill_effect_obj["Id"])
            case 7:
                out_weapon[effect_detail_prefix + "_Condition"] = "When debuff is on target"
            case 8:
                out_weapon[effect_detail_prefix + "_Condition"] = "When hitting target's weakness"
            case 13:
                out_weapon[effect_detail_prefix + "_Condition"] = "With command gauge at max in attack stance"
            case 14:
                out_weapon[effect_detail_prefix + "_Condition"] = "Against a single target"
            case 16:
                out_weapon[effect_detail_prefix + "_Condition"] = "On first use"
            case _:
                out_weapon[effect_detail_prefix + "_Condition"] = "UNKNOWN EFFECT CONDITION " + str(skill_effect_obj["TriggerType"]) + " on SkillEffectId: " + str(skill_effect_obj["Id"])

        match skill_effect_obj["SkillEffectType"]:
            case 1: # Damage effect
                out_weapon[effect_detail_prefix] = "EXTRA DAMAGE EFFECT"
                print("Warning: Extra damage effect detected")
            case 2: # Status Condition effect
                skill_status_condition_obj = skill_status_effect_data[skill_effect_detail_id]
                skill_status_condition_type = skill_status_condition_obj["SkillStatusConditionType"]
                if (skill_status_condition_type in status_effect_types):
                    out_weapon[effect_detail_prefix] = "Status Ailment: " + status_effect_types[skill_status_condition_type]
                else:
                    out_weapon[effect_detail_prefix] = "Status Ailment: UNKNOWN STATUS: " + str(skill_status_condition_type)  + " SkillEffectDetailId: " + str(skill_effect_detail_id)

                out_weapon[effect_detail_prefix + "_Duration"] = str(skill_status_condition_obj["MaxDurationSec"])
                out_weapon[effect_detail_prefix + "_Extend"] = str(skill_status_condition_obj["MaxDuplicationDurationSec"])
                if (skill_status_condition_obj["EffectCoefficient"] != 0):
                    out_weapon[effect_detail_prefix + "_Pot"] = "+" + str(round(skill_status_condition_obj["EffectCoefficient"] / 10,0)) + "%"

            case 3: # SkillBuffDebuff 
                skill_buffdebuff_obj = skill_buffdebuff_data[skill_effect_detail_id]
                skill_buffdebuff_type = skill_buffdebuff_obj["SkillBuffDebuffType"]
                if (skill_buffdebuff_type in buffdebuff_types):
                    out_weapon[effect_detail_prefix] = buffdebuff_types[skill_buffdebuff_type]
                else:
                    out_weapon[effect_detail_prefix] = "UNKNOWN BUFF/DEBUFF: " + str(skill_buffdebuff_type)  + " SkillEffectDetailId: " + str(skill_effect_detail_id)

                out_weapon[effect_detail_prefix + "_Duration"] = str(skill_buffdebuff_obj["MaxDurationSec"])
                out_weapon[effect_detail_prefix + "_Extend"] = str(skill_buffdebuff_obj["MaxDuplicationDurationSec"])
                out_weapon[effect_detail_prefix + "_Pot"] = buffdebuff_tiers[skill_buffdebuff_obj["TriggerEffectLevel"]]
                out_weapon[effect_detail_prefix + "_PotMax"] = buffdebuff_tiers[skill_buffdebuff_obj["TriggerEffectLevelMax"]]

            case 5: # SkillStatusChangeEffect (e.g. exploit weakness)
                skill_status_change_obj = skill_status_change_effect_data[skill_effect_detail_id]
                if (skill_status_change_obj["SkillStatusChangeType"] in status_change_types):
                    out_weapon[effect_detail_prefix] = status_change_types[skill_status_change_obj["SkillStatusChangeType"]]
                else:
                    out_weapon[effect_detail_prefix] = "UNKNOWN STATUS CHANGE TYPE " + str(skill_status_change_obj["SkillStatusChangeType"]) + " on SkillEffectDetailId: " + str(skill_effect_detail_id)
                    print (out_weapon[effect_detail_prefix])

                out_weapon[effect_detail_prefix + "_Pot"] = str(round(skill_status_change_obj["EffectCoefficient"]/10,0)) + "%"
                out_weapon[effect_detail_prefix + "_Duration"] = str(skill_status_change_obj["MaxDurationSec"])
                out_weapon[effect_detail_prefix + "_Extend"] = str(skill_status_change_obj["MaxDuplicationDurationSec"])
                out_weapon[effect_detail_prefix + "_EffectCount"] = str(skill_status_change_obj["EffectCount"]) # e.g. "Amp abilities up to 1 time(s)"

            case 6: # SkillCancelEffect (e.g. removes buff/debuff or removes status)
                skill_cancel_effect_obj = skill_cancel_effect_data[skill_effect_detail_id]
                skill_status_condition_type = skill_status_condition_obj["SkillStatusConditionType"]
                
                # the skillCancelEffect will point to a BuffDebuffGroupId -- a list of buffs to cancel --
                # and a StatusConditionGroupId -- a list of status effects to cancel -- and a StatusChangeGroupId
                # which is also a list of things to cancel. 
                # Therefore, we want the effect description to be assembled one effect at a time
                skill_cancel_effect = "Removes "

                if (skill_cancel_effect_obj["BuffDebuffGroupId"] != 0):
                    for idx in buffdebuff_group_data[skill_cancel_effect_obj["BuffDebuffGroupId"]]:
                        skill_cancel_effect += buffdebuff_types[idx] + ", "
                if (skill_cancel_effect_obj["StatusConditionGroupId"] != 0):
                    for idx in status_condition_group_data[skill_cancel_effect_obj["StatusConditionGroupId"]]:
                        skill_cancel_effect += "Ailment: " + status_effect_types[idx] + ", "
                if (skill_cancel_effect_obj["StatusChangeGroupId"] != 0):
                 for idx in status_change_group_data[skill_cancel_effect_obj["StatusChangeGroupId"]]:
                       skill_cancel_effect += buffdebuff_types[idx] + ", "
                
                skill_cancel_effect = skill_cancel_effect[:-2] # trim the final ", "
                out_weapon[effect_detail_prefix] = skill_cancel_effect

            case 7: # SkillAdditionalEffect (e.g. crits???)
                skill_additional_effect_obj = skill_additional_effect_data[skill_effect_detail_id]
                match skill_additional_effect_obj["SkillAdditionalType"]:
                    case 14: # crits
                        out_weapon[effect_detail_prefix] = "Crit Rate"
                        out_weapon[effect_detail_prefix + "_Pot"] = str(round(skill_additional_effect_obj["MaxValue"]/10,0)) + "%"
                    case 15: # e.g. "additional damage when debuff on target"
                        out_weapon[effect_detail_prefix] = "Multiply damage"
                        out_weapon[effect_detail_prefix + "_Pot"] = str(round(skill_additional_effect_obj["MaxValue"]/10,0)) + "%"
                    case 16: # fixed dmg (phys)
                        out_weapon[effect_detail_prefix] = "Deals Fixed Additional Damage"
                        out_weapon[effect_detail_prefix + "_Pot"] = skill_additional_effect_obj["MaxValue"]
                    case _:    
                        out_weapon[effect_detail_prefix] = "UNKNOWN ADDITIONAL EFFECT TYPE " + str(skill_additional_effect_obj["SkillAdditionalType"]) + " on SkillEffectDetailId: " + str(skill_effect_detail_id)

            case 16: # SkillAtbChangeEffect (+ATB!)
                skill_atbchange_effect_obj = skill_atbchange_effect_data[skill_effect_detail_id]
                out_weapon[effect_detail_prefix] = "ATB+" + str(skill_atbchange_effect_obj["Value"])
                
            case 26: # SkillSpecialGaugeChangeEffect (+Limit/summon bar)
                skill_special_gauge_change_obj = skill_special_gauge_change_data[skill_effect_detail_id]
                skill_special_gauge_type = special_gauge_types[skill_special_gauge_change_obj["TargetSkillSpecialType"]]
                match skill_special_gauge_change_obj["SkillSpecialGaugeChangeType"]:
                    case 1: # increases gauge
                        out_weapon[effect_detail_prefix] = "Increases " + skill_special_gauge_type
                        out_weapon[effect_detail_prefix + "_Pot"] = str(round(skill_special_gauge_change_obj["PermilValue"] / 10,0)) + "%"
                    case 2: # reduces gauge
                        out_weapon[effect_detail_prefix] = "Decreases " + skill_special_gauge_type
                        out_weapon[effect_detail_prefix + "_Pot"] = "-" + str(round(skill_special_gauge_change_obj["PermilValue"] / 10,0)) + "%"
                    case _:
                       out_weapon[effect_detail_prefix] = "UNKNOWN SPECIAL GAUGE CHANGE"  + " SkillEffectDetailId: " + str(skill_effect_detail_id)
                
            case 30: # SkillTacticsGaugeChangeEffect (+Stance change)
                skill_tactics_gauge_change_obj = skill_tactics_gauge_change_data[skill_effect_detail_id]
                match skill_tactics_gauge_change_obj["SkillEffectGaugeChangeType"]:
                    case 1: # increases gauge
                        out_weapon[effect_detail_prefix] = "Increases Command Gauge"
                        out_weapon[effect_detail_prefix + "_Pot"] = str(round(skill_tactics_gauge_change_obj["PermilValue"] / 10,0)) + "%"
                    case 2: # reduces gauge
                        out_weapon[effect_detail_prefix] = "Decreases Command Gauge"
                        out_weapon[effect_detail_prefix + "_Pot"] = "-" + str(round(skill_tactics_gauge_change_obj["PermilValue"] / 10,0)) + "%"
                    case _:
                       out_weapon[effect_detail_prefix] = "UNKNOWN TACTICS GAUGE CHANGE"  + " SkillEffectDetailId: " + str(skill_effect_detail_id)

            case 31: # SkillBuffDebuffEnhance (AC Gloves, Abraxas)
                skill_buffdebuff_enhance_obj = skill_buffdebuff_enhance_data[skill_effect_detail_id]
                match skill_buffdebuff_enhance_obj["BuffDebuffEnhanceType"]:
                    case 1: # increases gauge
                        out_weapon[effect_detail_prefix] = "Applied Stats Buff Tier Increased"
                    case 2: # reduces gauge
                        out_weapon[effect_detail_prefix] = "Applied Stats Debuff Tier Increased"
                    case _:
                        out_weapon[effect_detail_prefix] = "UNKNOWN BUFF/DEBUFF ENHANCE"  + " SkillEffectDetailId: " + str(skill_effect_detail_id)
                out_weapon[effect_detail_prefix + "_Pot"] = buffdebuff_tiers[skill_buffdebuff_enhance_obj["EnhanceEffectLevel"]]
                out_weapon[effect_detail_prefix + "_PotMax"] = buffdebuff_tiers[skill_buffdebuff_enhance_obj["EnhanceEffectLevelMax"]]
                out_weapon[effect_detail_prefix + "_Extend"] = skill_buffdebuff_enhance_obj["EnhanceDurationSec"]

            case _:
                out_weapon[effect_detail_prefix] = "UNKNOWN EFFECT: " + str(skill_effect_obj["SkillEffectType"]) + " SkillEffectDetailId: " + str(skill_effect_detail_id)

    out_weapons.append(out_weapon)

print_perf_data("Transform weapondata")

# with all of the weapon data transformed, write it out to csv

# add columns for every field we may have across the set of weapons
out_weapon_fields = set()
for out_weapon in out_weapons:
    out_weapon_fields |= out_weapon.keys()

# we want some columns locked at the front of the list,
# so remove them from the set above, then add every other field to the list
out_sorted_weapon_fields = [
    "Id",
    "Character",
    "Name",
]
for field in out_sorted_weapon_fields:
    out_weapon_fields.remove(field)
out_sorted_weapon_fields.extend(sorted(out_weapon_fields))

with open('weaponData-Staging.tsv', 'w', newline='', encoding='utf-8') as csvfile:
    csv_writer = csv.DictWriter(csvfile, out_sorted_weapon_fields, delimiter='\t')
    csv_writer.writeheader()
    for out_weapon in out_weapons:
        csv_writer.writerow(out_weapon)

print_perf_data("Output csv")
