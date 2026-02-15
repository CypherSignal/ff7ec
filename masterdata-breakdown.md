# Description of Objects and their Connections

### Weapon.json

Describes each weapon's common/level-agnostic data

- WeaponType: int
    - Major. Describes what type of 'gacha' it is. 
        - 0: Featured
        - 1: Grindable (summon weapons)
        - 2: Event
        - 3: Limited
- CharacterId: Character 
    - Major. describes who can use what
- WeaponMateriaSupportId0: MateriaSupport
- WeaponMateriaSupportId1: MateriaSupport
- WeaponMateriaSupportId2: MateriaSupport
    - Major. Describes materia slots.
- PassiveSkillId0: SkillPassive
- PassiveSkillId1: SkillPassive
    - Major. Describes r-abilities.
- NameLanguageId: Loc table ID
    - Major. It's the weapon's name!
- WeaponEquipmentType: 0/1 
    - Major. 0 is normal weapon. 1 is ultimate

### SkillBase.json

Describes data for each active ability.

- BaseAttackType: int 1-3
    - Phys/Mag/Both
- ElementType: int (1-7)
    - Major. obviously the element. Not sure what mapping is
- SkillEffectGroupId: SkillEffectGroup
- "NameLanguageId": 540000010100101,
    - The skill's name (won't need this)

### SkillEffectGroup

Note: MULTIPLE objects share the same Id.
This is how one ability can do multiple things, e.g. "Apply damage" and "Apply status effect" and "Add ATB" and...

- Seq: int
    - order of operations
- SkillEffectId: SkillEffect

### SkillEffect.json

- TargetType: int 1-5
    - Must be self/other allies/all allies/single-target/aoe

- SkillEffectType: int 1-7
    - Defines what kind of effect this is
    - 1: SkillDamageEffect
    - 2: SkillStatusConditionEffect
    - 3: SkillBuffDebuff
    - 4: SkillEnemyPhaseEffect
    - 5: SkillStatusChangeEffect
    - 6: SkillCancelEffect (??? probably just for enemies)
    - 7: SkillAdditionalEffect 
    - 17: SkillForceGauge
    - 33: SkillChainGaugeEffect (???)
- SkillEffectDetailId: 
    - id for more info, depending on SkillEffectType. That defines what table to look up
- TriggerType: int
    - Major. usually 1 but when non-1, TriggerConditionId and ConditionTargetType are set. Probably HP conditional. Need to explore this
- TriggerConditionId: skillTriggerConditionHp
- ConditionTargetType: int
- IsInvertTriggerCondition: bool
    - Major. Ostensibly flips condition from, eg, "need hp > X" to "need hp < X"

### WeaponRarity.json

Describes the starting points and starting ability of each weapon at OB0, and growth rates on stats. Not relevant.

### WeaponUpgradeSkill.json

Describes the OB-levels of each weapon, including r-abil points and which skill to use

Note: NOT KEYED ON ID!! Keyed on "WeaponId" and UpgradeCount (pick at OB1/6/10)
    
- WeaponId: key
- UpgradeCount: int
    OB level. Part of the key
- WeaponSkillId: SkillWeapon
    - SkillWeapon item has a SkillActiveId: SkillActive
- AddPassiveSkillPoint0: int
- AddPassiveSkillPoint1: int
    - Both of these add onto the r-abilities from somewhere else

### SkillActive.json

Describes link to base Id, cost, and use-count limit

- SkillBaseId: SkillBase
- Cost: int
    - ATB required
- UseCountLimit: int
    - Use count limit. Costume ability limits. (Ultimate weapons are defined elsewhere!)