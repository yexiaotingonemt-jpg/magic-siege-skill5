// 钉钉当前稿的可调开发参数；尚未通过战斗与计分平衡验收。
import { LEVEL_UP_STAMINA } from './experience.js';
export const CURRENT_DESIGN = {
  "enabled": true,
  "revision": "dingtalk-20261031-current",
  "status": "待平衡",
  "source": "https://alidocs.dingtalk.com/i/nodes/lyQod3RxJK3vADkBslqKj1EGJkb4Mw9r",
  "skills": {
    "0": [
      {
        "name": "汲血连接",
        "description": "持续汲取目标生命3秒，每秒造成相当于攻击力150%的伤害，并恢复等量生命；连接距离超过10格时中断。",
        "cost": 1,
        "cd": 6.0,
        "cast": 0.25,
        "range": 6.5,
        "radius": 3.0,
        "targets": 1,
        "power": 1.5,
        "duration": 3,
        "drain": 1.0,
        "vuln": 0.0,
        "secondary": 0.2,
        "channel": true,
        "break_range": 10
      },
      {
        "name": "守护战吼",
        "description": "发出战吼，使自身及附近最多2名友军受到的伤害降低20%，持续5秒。",
        "cost": 1,
        "cd": 10.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 2,
        "power": 0.0,
        "duration": 5.0,
        "reduction": 0.2,
        "haste": 0,
        "reflect": 0
      },
      {
        "name": "换位救援",
        "description": "与1名友军交换位置。该友军每损失1%生命，自身获得0.5%减伤，持续4秒。",
        "cost": 2,
        "cd": 20.0,
        "cast": 0.25,
        "range": 14.0,
        "radius": 3.0,
        "targets": 1,
        "power": 0.0,
        "duration": 4,
        "reduction_per_lost": 0.5,
        "reduction_cap": 0.5,
        "heal": 0.0,
        "blast": 0.0,
        "taunt": 0
      },
      {
        "name": "蓄伤壁垒",
        "description": "开启蓄伤壁垒，持续6秒。期间受到的有效伤害会被累计，结束时转化为自身护盾。",
        "cost": 3,
        "cd": 40.0,
        "cast": 0.25,
        "range": 0.0,
        "radius": 4.0,
        "targets": 1,
        "power": 0.0,
        "duration": 6.0,
        "shield_duration": 8.0,
        "start_shield": 0,
        "share": 0,
        "burst": 0,
        "immortal": false,
        "store_gain": 1.0
      }
    ],
    "4": [
      {
        "name": "烈焰冲击",
        "description": "向当前目标释放烈焰冲击，造成相当于攻击力320%的伤害，并获得1层炙热。",
        "cost": 1,
        "cd": 6.0,
        "cast": 0.25,
        "range": 9.0,
        "radius": 3.0,
        "targets": 1,
        "power": 3.2,
        "duration": 4.0,
        "attack_down": 0.0,
        "bounces": 0,
        "secondary": 0.4,
        "explode": 0.0,
        "heat_cap": 10,
        "heat_duration": 10.0
      },
      {
        "name": "焚魂标记",
        "description": "标记1名敌人，持续5秒。攻击命中被标记敌人时，附加相当于攻击力100%的伤害，并有30%的概率获得1层炙热。",
        "cost": 1,
        "cd": 10.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 1,
        "power": 0.0,
        "duration": 5,
        "per_hit": 1.0,
        "heat_chance": 0.3,
        "vuln": 0.0,
        "secondary": 1.0,
        "explode": 0.0
      },
      {
        "name": "炙热火球",
        "description": "向附近最多3名敌人释放火球，各造成相当于攻击力288%的伤害。每击杀1名敌人，获得1层炙热。",
        "cost": 2,
        "cd": 20.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 3,
        "power": 2.8800000000000003,
        "duration": 0.0,
        "isolated": 0,
        "knock": 0,
        "pierce": false,
        "kill_heat": 1
      },
      {
        "name": "天火审判",
        "description": "吟唱1秒，消耗全部炙热，向1名敌人降下天火，造成相当于攻击力800%的伤害；每消耗1层炙热，额外造成上述伤害的5%。",
        "cost": 3,
        "cd": 40.0,
        "cast": 1.0,
        "range": 16.0,
        "radius": 3.0,
        "targets": 1,
        "power": 8.0,
        "duration": 0.0,
        "secondary": 0.35,
        "heat_damage": 0.05,
        "refund": 0,
        "execute": 0
      }
    ],
    "5": [
      {
        "name": "灵息冲击",
        "description": "为1名友军恢复相当于攻击力240%的生命。",
        "cost": 1,
        "cd": 6.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 4.0,
        "targets": 1,
        "power": 0.0,
        "duration": 0.0,
        "heal": 2.4000000000000004,
        "damage_targets": 1,
        "vuln": 0,
        "twin": 0
      },
      {
        "name": "共生链接",
        "description": "与1名友军建立共生链接，持续6秒。链接期间，彼此共享所受有效治疗的42%。",
        "cost": 1,
        "cd": 10.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 1,
        "power": 0.0,
        "duration": 6.0,
        "share": 0.42,
        "reduction": 0.0,
        "haste": 0,
        "split": false
      },
      {
        "name": "献生净化",
        "description": "净化6格内最多2名友军的负面状态；每成功净化1个状态，为该友军恢复相当于攻击力256%的生命。",
        "cost": 2,
        "cd": 20.0,
        "cast": 0.25,
        "range": 6,
        "radius": 3.0,
        "targets": 2,
        "power": 0.0,
        "duration": 0.0,
        "cleanse_count": 99,
        "heal_per_cleanse": 2.5600000000000005,
        "attack_per_cleanse": 0.0,
        "boost_duration": 5.0,
        "healing_boost": 0,
        "bless_duration": 6.0
      },
      {
        "name": "生命群疗",
        "description": "持续吟唱2秒，立即及此后每秒为自身和附近生命比例最低的最多3名友军恢复相当于攻击力168%的生命，共3次。",
        "cost": 3,
        "cd": 40.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 3,
        "power": 0.0,
        "duration": 2.0,
        "channel": true,
        "heal": 1.6800000000000002,
        "pulses": 3,
        "over_shield": 0,
        "shield_cap": 0.15,
        "shield_duration": 6.0,
        "counter": 0
      }
    ],
    "2": [
      {
        "name": "腐蚀炮弹",
        "description": "向当前目标投掷腐蚀炮弹，命中其周围最多6名敌人。未分担时造成目标最大生命6%的伤害，最多为自身攻击力的200%。",
        "cost": 1,
        "cd": 6.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 6,
        "power": 0.0,
        "duration": 3.0,
        "hp_ratio": 0.06,
        "cap": 2.0,
        "extra_chance": 0,
        "heal_down": 0,
        "debuff_duration": 5.0,
        "dot_chance": 0,
        "dot_hp": 0.005
      },
      {
        "name": "冰霜炮弹",
        "description": "投掷冰霜炮弹，命中目标周围最多6名敌人。未分担时造成相当于攻击力200%的伤害，并使攻击速度降低15%，持续8秒。",
        "cost": 1,
        "cd": 10.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 6,
        "power": 2.0,
        "duration": 8.0,
        "attack_slow": 0.15,
        "self_haste": 0,
        "self_haste_duration": 10
      },
      {
        "name": "震荡炮弹",
        "description": "投掷震荡炮弹，命中目标周围最多6名敌人。未分担时造成相当于攻击力250%的伤害，并击退2格。",
        "cost": 2,
        "cd": 20.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 3.0,
        "targets": 6,
        "power": 2.5,
        "duration": 0.0,
        "knock": 2.0,
        "move_damage": 0,
        "blast": 0.0
      },
      {
        "name": "定点连轰",
        "description": "向当前目标所在位置连续炮击4次，作用半径4格，间隔0.7秒，每次造成相当于攻击力600%的伤害，并使移动速度降低30%，最多叠加3层，持续3秒。",
        "cost": 3,
        "cd": 40.0,
        "cast": 0.25,
        "range": 12.0,
        "radius": 4,
        "targets": 1,
        "power": 6.0,
        "duration": 2.8,
        "shots": 4,
        "gap": 0.7,
        "channel": true,
        "slow_per": 0.3,
        "slow_cap": 3,
        "slow_duration": 3.0,
        "ramp": 0.0
      }
    ],
    "3": [
      {
        "name": "裂地震荡",
        "description": "向前释放震荡波，命中最多3名敌人，各造成相当于攻击力380%的伤害，并使攻击力降低16%，持续2秒。",
        "cost": 1,
        "cd": 6.0,
        "cast": 0.25,
        "range": 10.0,
        "radius": 7.0,
        "targets": 3,
        "power": 3.8,
        "duration": 2.0,
        "attack_down": 0.16,
        "slow": 0,
        "slow_duration": 2.5,
        "echo": 0,
        "pull": 0
      },
      {
        "name": "尖刺外壳",
        "description": "为自身披上尖刺外壳，持续5秒。期间每次受到攻击时，对攻击者反弹相当于其攻击力150%的伤害。",
        "cost": 1,
        "cd": 10.0,
        "cast": 0.25,
        "range": 0.0,
        "radius": 3.0,
        "targets": 1,
        "power": 0.0,
        "duration": 5,
        "reduction": 0.0,
        "thorn": 1.5,
        "attack_down": 0,
        "debuff_duration": 3.0,
        "death_slow": 0,
        "slow_duration": 3.0
      },
      {
        "name": "暗影冲锋",
        "description": "短暂蓄势后向当前目标冲锋，使其晕眩1秒，并对沿途最多3名敌人造成相当于攻击力300%的伤害。",
        "cost": 2,
        "cd": 20.0,
        "cast": 0.7,
        "range": 14.0,
        "radius": 0.75,
        "targets": 3,
        "power": 3.0,
        "duration": 0.0,
        "stun": 1.0,
        "drag": false
      },
      {
        "name": "灭军君临",
        "description": "进入君临状态，持续5秒。期间免疫负面效果，每次普通攻击还会对主目标周围最多2名敌人造成相当于攻击力400%的伤害。",
        "cost": 3,
        "cd": 40.0,
        "cast": 0.25,
        "range": 0.0,
        "radius": 7.0,
        "targets": 2,
        "power": 4.0,
        "duration": 5,
        "shield": 0,
        "shield_duration": 5,
        "lifesteal": 0,
        "summon": 0,
        "summon_duration": 6.0
      }
    ]
  },
  "heroes": {
    "0": {
      "hp": 16000.0,
      "attack": 200.0,
      "interval": 1.5,
      "range": 1.5,
      "speed": 2,
      "hpGrowth": 0.02,
      "attackGrowth": 0.02
    },
    "4": {
      "hp": 12000.0,
      "attack": 340.0,
      "interval": 1.7,
      "range": 6.5,
      "speed": 2,
      "hpGrowth": 0.02,
      "attackGrowth": 0.025
    },
    "5": {
      "hp": 14000.0,
      "attack": 272.0,
      "interval": 1.7,
      "range": 6.5,
      "speed": 2,
      "hpGrowth": 0.02,
      "attackGrowth": 0.01
    },
    "2": {
      "hp": 10000.0,
      "attack": 426.6666666666667,
      "interval": 2.8,
      "range": 10.5,
      "speed": 1.5,
      "hpGrowth": 0.02,
      "attackGrowth": 0.015
    },
    "3": {
      "hp": 65520.0,
      "attack": 266.6666666666667,
      "interval": 1.5,
      "range": 1.5,
      "speed": 2,
      "hpGrowth": 0.009,
      "attackGrowth": 0.02
    }
  },
  "affixes": [
    {
      "id": "N000_0",
      "sourceId": 0,
      "classId": 0,
      "skill": 0,
      "name": "技能伤害提升",
      "description": "每次汲取的伤害增加攻击力的12.8%/25.6%/38.4%/51.2%/64%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          1.628
        ],
        [
          1.7560000000000002
        ],
        [
          1.8840000000000001
        ],
        [
          2.012
        ],
        [
          2.14
        ]
      ],
      "baseline": [
        1.5
      ]
    },
    {
      "id": "N001_0",
      "sourceId": 1,
      "classId": 0,
      "skill": 0,
      "name": "伤害加深",
      "description": "被汲取敌人受到的伤害提高6%/12%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "vuln"
      ],
      "values": [
        [
          0.06
        ],
        [
          0.12
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N002_0",
      "sourceId": 2,
      "classId": 0,
      "skill": 0,
      "name": "持续时间延长",
      "description": "汲血连接的持续时间延长1/2秒（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": false,
      "keys": [
        "duration"
      ],
      "values": [
        [
          4.0
        ],
        [
          5.0
        ]
      ],
      "baseline": [
        3
      ]
    },
    {
      "id": "N003_0",
      "sourceId": 3,
      "classId": 0,
      "skill": 0,
      "name": "额外目标",
      "description": "汲血连接额外连接2名敌人，额外目标的汲取伤害和治疗量为主目标的20%（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          3
        ]
      ],
      "baseline": [
        1
      ]
    },
    {
      "id": "N004_0",
      "sourceId": 4,
      "classId": 0,
      "skill": 1,
      "name": "减伤提升",
      "description": "战吼的减伤比例增加10/20个百分点（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "reduction"
      ],
      "values": [
        [
          0.3
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0.2
      ]
    },
    {
      "id": "N005_0",
      "sourceId": 5,
      "classId": 0,
      "skill": 1,
      "name": "目标增加",
      "description": "战吼额外影响1/2名友军（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          3
        ],
        [
          4
        ]
      ],
      "baseline": [
        2
      ]
    },
    {
      "id": "N006_0",
      "sourceId": 6,
      "classId": 0,
      "skill": 1,
      "name": "攻击速度提升",
      "description": "战吼期间，受影响单位的攻击速度提高10%/20%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N007_0",
      "sourceId": 7,
      "classId": 0,
      "skill": 1,
      "name": "反弹伤害",
      "description": "战吼期间，将受到的有效伤害的30%/60%反弹给攻击者（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "reflect"
      ],
      "values": [
        [
          0.3
        ],
        [
          0.6
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N008_0",
      "sourceId": 8,
      "classId": 0,
      "skill": 2,
      "name": "减伤时间延长",
      "description": "换位救援的减伤时间延长2/4秒（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "duration"
      ],
      "values": [
        [
          4.5
        ],
        [
          6.5
        ]
      ],
      "baseline": [
        2.5
      ]
    },
    {
      "id": "N009_0",
      "sourceId": 9,
      "classId": 0,
      "skill": 2,
      "name": "治疗友军",
      "description": "为被救援友军恢复相当于攻击力200%/400%/600%的生命（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heal"
      ],
      "values": [
        [
          2.0
        ],
        [
          4.0
        ],
        [
          6.0
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N010_0",
      "sourceId": 10,
      "classId": 0,
      "skill": 2,
      "name": "落点冲击",
      "description": "抵达换位落点时，对周围敌人造成相当于攻击力80%/160%/240%的伤害（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "blast"
      ],
      "values": [
        [
          0.8
        ],
        [
          1.6
        ],
        [
          2.4
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N011_0",
      "sourceId": 11,
      "classId": 0,
      "skill": 2,
      "name": "嘲讽",
      "description": "换位后嘲讽周围敌人2秒（上限1档）。",
      "max": 1,
      "rarity": "purple",
      "common": false,
      "keys": [
        "taunt"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N012_0",
      "sourceId": 12,
      "classId": 0,
      "skill": 3,
      "name": "开启护盾",
      "description": "开启壁垒时，获得相当于最大生命8%的护盾（上限1档）。",
      "max": 1,
      "rarity": "purple",
      "common": false,
      "keys": [
        "start_shield"
      ],
      "values": [
        [
          0.08
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N013_0",
      "sourceId": 13,
      "classId": 0,
      "skill": 3,
      "name": "友军伤害累计",
      "description": "将附近友军受到伤害的30%/60%计入壁垒蓄伤（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "share"
      ],
      "values": [
        [
          0.3
        ],
        [
          0.6
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N014_0",
      "sourceId": 14,
      "classId": 0,
      "skill": 3,
      "name": "累计伤害爆发",
      "description": "壁垒结束时，对周围敌人造成相当于累计伤害40%/80%的伤害（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": false,
      "keys": [
        "burst"
      ],
      "values": [
        [
          0.4
        ],
        [
          0.8
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N015_0",
      "sourceId": 15,
      "classId": 0,
      "skill": 3,
      "name": "不死",
      "description": "壁垒持续期间，自身生命不会低于1（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "immortal"
      ],
      "values": [
        [
          1
        ]
      ],
      "baseline": [
        false
      ]
    },
    {
      "id": "N016_4",
      "sourceId": 16,
      "classId": 4,
      "skill": 0,
      "name": "技能伤害提升",
      "description": "烈焰冲击的伤害增加攻击力的25.6%/51.2%/76.8%/102%/128%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          3.456
        ],
        [
          3.712
        ],
        [
          3.968
        ],
        [
          4.224
        ],
        [
          4.4799999999999995
        ]
      ],
      "baseline": [
        3.2
      ]
    },
    {
      "id": "N017_4",
      "sourceId": 17,
      "classId": 4,
      "skill": 0,
      "name": "降低攻击力",
      "description": "命中敌人的攻击力降低10%/20%，持续4秒（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "attack_down"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N018_4",
      "sourceId": 18,
      "classId": 4,
      "skill": 0,
      "name": "弹射",
      "description": "烈焰额外弹射1/2名敌人，每次造成主伤害35%的伤害（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": false,
      "keys": [
        "bounces"
      ],
      "values": [
        [
          1
        ],
        [
          2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N019_4",
      "sourceId": 19,
      "classId": 4,
      "skill": 0,
      "name": "击杀爆炸",
      "description": "击杀目标时引发爆炸，对周围敌人造成相当于攻击力192%的伤害（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "explode"
      ],
      "values": [
        [
          1.92
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N020_4",
      "sourceId": 20,
      "classId": 4,
      "skill": 1,
      "name": "附加伤害提升",
      "description": "攻击被标记敌人时，附加伤害增加攻击力的25.6%/51.2%/76.8%/102%/128%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": false,
      "keys": [
        "per_hit"
      ],
      "values": [
        [
          1.256
        ],
        [
          1.5119999999999998
        ],
        [
          1.7679999999999996
        ],
        [
          2.024
        ],
        [
          2.2800000000000002
        ]
      ],
      "baseline": [
        1.0
      ]
    },
    {
      "id": "N021_4",
      "sourceId": 21,
      "classId": 4,
      "skill": 1,
      "name": "伤害加深",
      "description": "被标记敌人受到的伤害提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "vuln"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N022_4",
      "sourceId": 22,
      "classId": 4,
      "skill": 1,
      "name": "获热概率提升",
      "description": "攻击被标记敌人时，获得炙热的概率增加70个百分点（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heat_chance"
      ],
      "values": [
        [
          1.0
        ]
      ],
      "baseline": [
        0.3
      ]
    },
    {
      "id": "N023_4",
      "sourceId": 23,
      "classId": 4,
      "skill": 1,
      "name": "死亡爆炸",
      "description": "被标记敌人阵亡时引发爆炸，对周围敌人造成相当于攻击力128%的伤害（上限1档）。",
      "max": 1,
      "rarity": "purple",
      "common": false,
      "keys": [
        "explode"
      ],
      "values": [
        [
          1.2800000000000002
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N024_4",
      "sourceId": 24,
      "classId": 4,
      "skill": 2,
      "name": "技能伤害提升",
      "description": "火球的伤害增加攻击力的38.4%/76.8%/115%/154%/192%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          3.2640000000000002
        ],
        [
          3.6480000000000006
        ],
        [
          4.032
        ],
        [
          4.4159999999999995
        ],
        [
          4.800000000000001
        ]
      ],
      "baseline": [
        2.8800000000000003
      ]
    },
    {
      "id": "N025_4",
      "sourceId": 25,
      "classId": 4,
      "skill": 2,
      "name": "孤立增伤",
      "description": "火球只命中1名敌人时，伤害额外提高150%（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "isolated"
      ],
      "values": [
        [
          1.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N026_4",
      "sourceId": 26,
      "classId": 4,
      "skill": 2,
      "name": "目标增加",
      "description": "火球额外命中1名敌人（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          4
        ]
      ],
      "baseline": [
        3
      ]
    },
    {
      "id": "N027_4",
      "sourceId": 27,
      "classId": 4,
      "skill": 2,
      "name": "击退",
      "description": "火球将命中敌人击退2格（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "knock"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N028_4",
      "sourceId": 28,
      "classId": 4,
      "skill": 2,
      "name": "贯穿火球",
      "description": "火球化为缓慢前进的巨大贯穿火球，以每秒2.5格前进12格，对沿途1.5格内的敌人造成多段伤害；同一敌人每0.6秒最多受伤1次，每段为普通火球伤害的40%（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "pierce"
      ],
      "values": [
        [
          1
        ]
      ],
      "baseline": [
        false
      ]
    },
    {
      "id": "N029_4",
      "sourceId": 29,
      "classId": 4,
      "skill": 3,
      "name": "技能伤害提升",
      "description": "天火的伤害增加攻击力的125%/250%/375%/500%/625%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          9.25
        ],
        [
          10.5
        ],
        [
          11.75
        ],
        [
          13.000000000000002
        ],
        [
          14.250000000000002
        ]
      ],
      "baseline": [
        8.0
      ]
    },
    {
      "id": "N030_4",
      "sourceId": 30,
      "classId": 4,
      "skill": 3,
      "name": "目标增加",
      "description": "天火额外命中1/2名敌人，额外目标受到主伤害的35%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          2
        ],
        [
          3
        ]
      ],
      "baseline": [
        1
      ]
    },
    {
      "id": "N031_4",
      "sourceId": 31,
      "classId": 4,
      "skill": 3,
      "name": "击杀返热",
      "description": "天火每击杀1名敌人，立即获得6层炙热（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "refund"
      ],
      "values": [
        [
          6.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N032_4",
      "sourceId": 32,
      "classId": 4,
      "skill": 3,
      "name": "斩杀",
      "description": "天火直接斩杀生命低于最大生命12%的敌人（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "execute"
      ],
      "values": [
        [
          0.12
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N033_5",
      "sourceId": 33,
      "classId": 5,
      "skill": 0,
      "name": "治疗提升",
      "description": "恢复的生命增加攻击力的32%/64%/96%/128%/160%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heal"
      ],
      "values": [
        [
          2.72
        ],
        [
          3.04
        ],
        [
          3.3600000000000003
        ],
        [
          3.6799999999999997
        ],
        [
          4.0
        ]
      ],
      "baseline": [
        2.4000000000000004
      ]
    },
    {
      "id": "N034_5",
      "sourceId": 34,
      "classId": 5,
      "skill": 0,
      "name": "伤害目标增加",
      "description": "该次治疗转化的伤害额外命中1/2名敌人（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "damage_targets"
      ],
      "values": [
        [
          2
        ],
        [
          3
        ]
      ],
      "baseline": [
        1
      ]
    },
    {
      "id": "N035_5",
      "sourceId": 35,
      "classId": 5,
      "skill": 0,
      "name": "伤害加深",
      "description": "受到该技能伤害的敌人，受到的伤害提高8%/16%，持续4秒（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "vuln"
      ],
      "values": [
        [
          0.08
        ],
        [
          0.16
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N036_5",
      "sourceId": 36,
      "classId": 5,
      "skill": 0,
      "name": "额外治疗",
      "description": "同时治疗主目标附近生命比例最低的1名友军，恢复主治疗量60%的生命（上限1档）。",
      "max": 1,
      "rarity": "purple",
      "common": false,
      "keys": [
        "twin"
      ],
      "values": [
        [
          0.6
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N037_5",
      "sourceId": 37,
      "classId": 5,
      "skill": 1,
      "name": "减伤",
      "description": "被链接友军受到的伤害降低20%/40%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "reduction"
      ],
      "values": [
        [
          0.2
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N038_5",
      "sourceId": 38,
      "classId": 5,
      "skill": 1,
      "name": "链接目标增加",
      "description": "共生链接额外连接1/2名友军（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          2
        ],
        [
          3
        ]
      ],
      "baseline": [
        1
      ]
    },
    {
      "id": "N039_5",
      "sourceId": 39,
      "classId": 5,
      "skill": 1,
      "name": "攻击速度提升",
      "description": "被链接友军的攻击速度提高20%/40%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.2
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N040_5",
      "sourceId": 40,
      "classId": 5,
      "skill": 1,
      "name": "伤害平摊",
      "description": "链接期间，自身与被链接友军平摊受到的伤害（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "split"
      ],
      "values": [
        [
          1
        ]
      ],
      "baseline": [
        false
      ]
    },
    {
      "id": "N041_5",
      "sourceId": 41,
      "classId": 5,
      "skill": 2,
      "name": "范围扩大",
      "description": "净化的作用范围增加2/4格（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "range"
      ],
      "values": [
        [
          6.0
        ],
        [
          8.0
        ]
      ],
      "baseline": [
        4.0
      ]
    },
    {
      "id": "N042_5",
      "sourceId": 42,
      "classId": 5,
      "skill": 2,
      "name": "目标增加",
      "description": "净化额外影响1/2名友军（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          3
        ],
        [
          4
        ]
      ],
      "baseline": [
        2
      ]
    },
    {
      "id": "N043_5",
      "sourceId": 43,
      "classId": 5,
      "skill": 2,
      "name": "净化增攻",
      "description": "每成功净化1个负面状态，自身攻击力提高5%，持续5秒（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "attack_per_cleanse"
      ],
      "values": [
        [
          0.05
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N044_5",
      "sourceId": 44,
      "classId": 5,
      "skill": 2,
      "name": "受到治疗提升",
      "description": "被净化友军受到的治疗提高30%，持续6秒（上限1档）。",
      "max": 1,
      "rarity": "purple",
      "common": false,
      "keys": [
        "healing_boost"
      ],
      "values": [
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N045_5",
      "sourceId": 45,
      "classId": 5,
      "skill": 3,
      "name": "治疗提升",
      "description": "每次恢复的生命增加攻击力的20.8%/41.6%/62.4%/83.2%/104%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heal"
      ],
      "values": [
        [
          1.8880000000000003
        ],
        [
          2.096
        ],
        [
          2.304
        ],
        [
          2.5120000000000005
        ],
        [
          2.7200000000000006
        ]
      ],
      "baseline": [
        1.6800000000000002
      ]
    },
    {
      "id": "N046_5",
      "sourceId": 46,
      "classId": 5,
      "skill": 3,
      "name": "治疗人数增加",
      "description": "每次额外治疗1/2名友军（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          4
        ],
        [
          5
        ]
      ],
      "baseline": [
        3
      ]
    },
    {
      "id": "N047_5",
      "sourceId": 47,
      "classId": 5,
      "skill": 3,
      "name": "过量转盾",
      "description": "溢出治疗的40%/80%转化为持续6秒的护盾，护盾最多为受益单位最大生命的15%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "over_shield"
      ],
      "values": [
        [
          0.4
        ],
        [
          0.8
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N048_5",
      "sourceId": 48,
      "classId": 5,
      "skill": 3,
      "name": "治疗转伤",
      "description": "对被治疗友军周围最多3名敌人，额外造成有效治疗量10%/15%的伤害（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "counter"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.15000000000000002
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N049_2",
      "sourceId": 49,
      "classId": 2,
      "skill": 0,
      "name": "下一次减疗",
      "description": "命中敌人下一次受到的治疗降低50%（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heal_down"
      ],
      "values": [
        [
          0.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N050_2",
      "sourceId": 50,
      "classId": 2,
      "skill": 0,
      "name": "追加攻击",
      "description": "有20%的概率追加1次相同攻击（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "extra_chance"
      ],
      "values": [
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N051_2",
      "sourceId": 51,
      "classId": 2,
      "skill": 0,
      "name": "持续腐蚀",
      "description": "有30%的概率附加持续腐蚀，每秒造成敌人最大生命0.5%/1%/1.5%/2%的伤害，持续3秒（上限4档）。",
      "max": 4,
      "rarity": "blue",
      "common": false,
      "keys": [
        "dot_chance",
        "dot_hp"
      ],
      "values": [
        [
          0.3,
          0.005
        ],
        [
          0.3,
          0.01
        ],
        [
          0.3,
          0.015
        ],
        [
          0.3,
          0.02
        ]
      ],
      "baseline": [
        0,
        0.005
      ]
    },
    {
      "id": "N052_2",
      "sourceId": 52,
      "classId": 2,
      "skill": 0,
      "name": "技能伤害提升",
      "description": "腐蚀伤害增加目标最大生命的1%/2%/3%，单次伤害上限增加自身攻击力的50%/100%/150%（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "hp_ratio",
        "cap"
      ],
      "values": [
        [
          0.07,
          2.5
        ],
        [
          0.08,
          3.0
        ],
        [
          0.09,
          3.5
        ]
      ],
      "baseline": [
        0.06,
        2.0
      ]
    },
    {
      "id": "N053_2",
      "sourceId": 53,
      "classId": 2,
      "skill": 1,
      "name": "技能伤害提升",
      "description": "冰霜炮弹的伤害增加攻击力的60%/120%/180%（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          2.6
        ],
        [
          3.1999999999999997
        ],
        [
          3.8000000000000003
        ]
      ],
      "baseline": [
        2.0
      ]
    },
    {
      "id": "N054_2",
      "sourceId": 54,
      "classId": 2,
      "skill": 1,
      "name": "降低攻击速度",
      "description": "冰霜炮弹的攻速降低比例增加20/40个百分点（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "attack_slow"
      ],
      "values": [
        [
          0.35
        ],
        [
          0.55
        ]
      ],
      "baseline": [
        0.15
      ]
    },
    {
      "id": "N055_2",
      "sourceId": 55,
      "classId": 2,
      "skill": 1,
      "name": "自身攻速提升",
      "description": "自身攻击速度提高200%除以分担目标数，持续10秒（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "self_haste"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N056_2",
      "sourceId": 56,
      "classId": 2,
      "skill": 2,
      "name": "技能伤害提升",
      "description": "震荡炮弹的伤害增加攻击力的80%/160%/240%（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          3.3
        ],
        [
          4.1
        ],
        [
          4.9
        ]
      ],
      "baseline": [
        2.5
      ]
    },
    {
      "id": "N057_2",
      "sourceId": 57,
      "classId": 2,
      "skill": 2,
      "name": "击退距离增加",
      "description": "震荡炮弹的击退距离增加4/8格（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "knock"
      ],
      "values": [
        [
          6.0
        ],
        [
          10.0
        ]
      ],
      "baseline": [
        2.0
      ]
    },
    {
      "id": "N058_2",
      "sourceId": 58,
      "classId": 2,
      "skill": 2,
      "name": "位移伤害",
      "description": "每击退1格，额外造成相当于攻击力40%的伤害（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "move_damage"
      ],
      "values": [
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N059_2",
      "sourceId": 59,
      "classId": 2,
      "skill": 2,
      "name": "二次爆炸",
      "description": "被击退敌人的落点再次爆炸，造成相当于攻击力80%/160%/240%的伤害（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "blast"
      ],
      "values": [
        [
          0.8
        ],
        [
          1.6
        ],
        [
          2.4
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N060_2",
      "sourceId": 60,
      "classId": 2,
      "skill": 3,
      "name": "技能伤害提升",
      "description": "每次炮击的伤害增加攻击力的40%/80%/120%（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          6.4
        ],
        [
          6.8
        ],
        [
          7.2
        ]
      ],
      "baseline": [
        6.0
      ]
    },
    {
      "id": "N061_2",
      "sourceId": 61,
      "classId": 2,
      "skill": 3,
      "name": "炮数增加",
      "description": "连续炮击次数增加2次（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "shots"
      ],
      "values": [
        [
          6
        ]
      ],
      "baseline": [
        4
      ]
    },
    {
      "id": "N062_2",
      "sourceId": 62,
      "classId": 2,
      "skill": 3,
      "name": "逐炮增伤",
      "description": "从第2炮起，每炮比上一炮增加相当于首炮伤害20%的伤害（上限1档）。",
      "max": 1,
      "rarity": "purple",
      "common": false,
      "keys": [
        "ramp"
      ],
      "values": [
        [
          0.2
        ]
      ],
      "baseline": [
        0.0
      ]
    },
    {
      "id": "N064_3",
      "sourceId": 64,
      "classId": 3,
      "skill": 0,
      "name": "技能伤害提升",
      "description": "震荡波的伤害增加攻击力的33%/59.1%/96%（上限3档）。",
      "max": 3,
      "rarity": "purple",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          4.130239999999999
        ],
        [
          4.391360000000001
        ],
        [
          4.76
        ]
      ],
      "baseline": [
        3.8
      ]
    },
    {
      "id": "N065_3",
      "sourceId": 65,
      "classId": 3,
      "skill": 0,
      "name": "目标增加",
      "description": "震荡波额外命中1名敌人（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          4
        ]
      ],
      "baseline": [
        3
      ]
    },
    {
      "id": "N066_3",
      "sourceId": 66,
      "classId": 3,
      "skill": 0,
      "name": "移动减速",
      "description": "被震荡波命中敌人的移动速度降低15%/30%，持续2.5秒（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "slow"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N067_3",
      "sourceId": 67,
      "classId": 3,
      "skill": 0,
      "name": "返回波牵引",
      "description": "震荡波折返，造成首段伤害15%的伤害，并将敌人向自身牵引1.5格（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "echo",
        "pull"
      ],
      "values": [
        [
          0.15,
          1.5
        ]
      ],
      "baseline": [
        0,
        0
      ]
    },
    {
      "id": "N068_3",
      "sourceId": 68,
      "classId": 3,
      "skill": 1,
      "name": "持续时间延长",
      "description": "尖刺外壳的持续时间延长1/2秒（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "duration"
      ],
      "values": [
        [
          2.2
        ],
        [
          3.2
        ]
      ],
      "baseline": [
        1.2
      ]
    },
    {
      "id": "N069_3",
      "sourceId": 69,
      "classId": 3,
      "skill": 1,
      "name": "攻击者降攻",
      "description": "攻击者的攻击力降低25%/50%，持续3秒（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "attack_down"
      ],
      "values": [
        [
          0.25
        ],
        [
          0.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N070_3",
      "sourceId": 70,
      "classId": 3,
      "skill": 1,
      "name": "反伤击杀减攻速",
      "description": "敌人因反弹伤害阵亡时，周围敌人的攻击速度降低40%，持续3秒（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "death_slow"
      ],
      "values": [
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N071_3",
      "sourceId": 71,
      "classId": 3,
      "skill": 2,
      "name": "技能伤害提升",
      "description": "冲锋的伤害增加攻击力的49.8%/107%/157%（上限3档）。",
      "max": 3,
      "rarity": "blue",
      "common": false,
      "keys": [
        "power"
      ],
      "values": [
        [
          3.4979199999999997
        ],
        [
          4.071999999999999
        ],
        [
          4.5680000000000005
        ]
      ],
      "baseline": [
        3.0
      ]
    },
    {
      "id": "N072_3",
      "sourceId": 72,
      "classId": 3,
      "skill": 2,
      "name": "目标增加",
      "description": "冲锋额外命中1名敌人（上限1档）。",
      "max": 1,
      "rarity": "purple",
      "common": false,
      "keys": [
        "targets"
      ],
      "values": [
        [
          4
        ]
      ],
      "baseline": [
        3
      ]
    },
    {
      "id": "N073_3",
      "sourceId": 73,
      "classId": 3,
      "skill": 2,
      "name": "终点拖拽",
      "description": "将冲锋命中的沿途敌人拖拽至冲锋终点（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "drag"
      ],
      "values": [
        [
          1
        ]
      ],
      "baseline": [
        false
      ]
    },
    {
      "id": "N074_3",
      "sourceId": 74,
      "classId": 3,
      "skill": 3,
      "name": "持续时间延长",
      "description": "君临状态的持续时间延长1/2秒（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "duration"
      ],
      "values": [
        [
          4.0
        ],
        [
          5.0
        ]
      ],
      "baseline": [
        3.0
      ]
    },
    {
      "id": "N075_3",
      "sourceId": 75,
      "classId": 3,
      "skill": 3,
      "name": "释放护盾",
      "description": "开启君临时，获得相当于最大生命4%/8.2%的护盾，持续至君临结束（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": false,
      "keys": [
        "shield"
      ],
      "values": [
        [
          0.04
        ],
        [
          0.082
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N076_3",
      "sourceId": 76,
      "classId": 3,
      "skill": 3,
      "name": "技能吸血",
      "description": "君临期间获得20%的技能吸血（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "lifesteal"
      ],
      "values": [
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N077_3",
      "sourceId": 77,
      "classId": 3,
      "skill": 3,
      "name": "亡灵护卫",
      "description": "君临期间击杀敌人会召出亡灵护卫；护卫生命2,000、攻击180、每1.5秒攻击1次，持续6秒，最多同时存在2名（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "summon"
      ],
      "values": [
        [
          2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N078_3",
      "sourceId": 78,
      "classId": 3,
      "skill": null,
      "name": "累计受伤减伤",
      "description": "每累计受到最大生命10%的伤害，受到的伤害降低8%，持续5秒（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "passive_dr"
      ],
      "values": [
        [
          1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N079_4",
      "sourceId": 79,
      "classId": 4,
      "skill": null,
      "name": "初始炙热",
      "description": "初始炙热增加3层（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "initial_heat"
      ],
      "values": [
        [
          3.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N080_4",
      "sourceId": 80,
      "classId": 4,
      "skill": null,
      "name": "炙热保留时间",
      "description": "炙热的保留时间延长5/10秒（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heat_duration_extra"
      ],
      "values": [
        [
          5.0
        ],
        [
          10.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N081_4",
      "sourceId": 81,
      "classId": 4,
      "skill": null,
      "name": "炙热上限",
      "description": "炙热的层数上限增加2/4层（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heat_cap_extra"
      ],
      "values": [
        [
          2.0
        ],
        [
          4.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N082_4",
      "sourceId": 82,
      "classId": 4,
      "skill": null,
      "name": "每层额外攻速",
      "description": "每层炙热提供的攻击速度额外增加1个百分点（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heat_haste_extra"
      ],
      "values": [
        [
          0.01
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N083_4",
      "sourceId": 83,
      "classId": 4,
      "skill": null,
      "name": "获热耗热增攻",
      "description": "每获得或消耗1层炙热，自身攻击力提高1.2%，持续5秒，最高提高20%（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "heat_attack_proc"
      ],
      "values": [
        [
          0.012
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N084_5",
      "sourceId": 84,
      "classId": 5,
      "skill": null,
      "name": "伤害提升",
      "description": "治疗转化的伤害提高20%/40%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "elf_damage_bonus"
      ],
      "values": [
        [
          0.2
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N085_5",
      "sourceId": 85,
      "classId": 5,
      "skill": null,
      "name": "目标增加",
      "description": "治疗转化的伤害额外命中1名敌人（上限1档）。",
      "max": 1,
      "rarity": "gold",
      "common": false,
      "keys": [
        "elf_extra_targets"
      ],
      "values": [
        [
          1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N086_5",
      "sourceId": 86,
      "classId": 5,
      "skill": null,
      "name": "攻击速度提升",
      "description": "攻击速度提高10%/20%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N087_5",
      "sourceId": 87,
      "classId": 5,
      "skill": null,
      "name": "攻击力提升",
      "description": "攻击力提高3%/6%/9%/12%（上限4档）。",
      "max": 4,
      "rarity": "blue",
      "common": false,
      "keys": [
        "attack_bonus"
      ],
      "values": [
        [
          0.03
        ],
        [
          0.06
        ],
        [
          0.09
        ],
        [
          0.12
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N088_5",
      "sourceId": 88,
      "classId": 5,
      "skill": null,
      "name": "缺血增攻",
      "description": "自身每损失1%生命，攻击力提高0.1%，最高提高10%（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "missing_attack"
      ],
      "values": [
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N089_0",
      "sourceId": 89,
      "classId": 0,
      "skill": null,
      "name": "攻击速度提升",
      "description": "攻击速度提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N090_0",
      "sourceId": 90,
      "classId": 0,
      "skill": null,
      "name": "攻击力提升",
      "description": "攻击力提高4%/8%/12%/16%（上限4档）。",
      "max": 4,
      "rarity": "blue",
      "common": false,
      "keys": [
        "attack_bonus"
      ],
      "values": [
        [
          0.04
        ],
        [
          0.08
        ],
        [
          0.12
        ],
        [
          0.16
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N091_0",
      "sourceId": 91,
      "classId": 0,
      "skill": null,
      "name": "缺血吸血",
      "description": "自身每损失1%生命，普通攻击吸血提高0.4个百分点，最高40%（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "missing_lifesteal"
      ],
      "values": [
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N092_2",
      "sourceId": 92,
      "classId": 2,
      "skill": null,
      "name": "减轻分担衰减",
      "description": "多目标分担后的合计效果提高5个百分点（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "share_relief"
      ],
      "values": [
        [
          0.05
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N093_2",
      "sourceId": 93,
      "classId": 2,
      "skill": null,
      "name": "对建筑伤害提升",
      "description": "对建筑造成的伤害提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": false,
      "keys": [
        "building_bonus"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N094_2",
      "sourceId": 94,
      "classId": 2,
      "skill": null,
      "name": "攻击距离增加",
      "description": "普通攻击距离增加2格（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": false,
      "keys": [
        "range_bonus"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N095_0",
      "sourceId": 95,
      "classId": 0,
      "skill": null,
      "name": "生命上限",
      "description": "最大生命提高5%/10%/15%/20%（上限4档）。",
      "max": 4,
      "rarity": "purple",
      "common": true,
      "keys": [
        "hp_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N095_4",
      "sourceId": 95,
      "classId": 4,
      "skill": null,
      "name": "生命上限",
      "description": "最大生命提高5%/10%/15%/20%（上限4档）。",
      "max": 4,
      "rarity": "purple",
      "common": true,
      "keys": [
        "hp_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N095_5",
      "sourceId": 95,
      "classId": 5,
      "skill": null,
      "name": "生命上限",
      "description": "最大生命提高5%/10%/15%/20%（上限4档）。",
      "max": 4,
      "rarity": "purple",
      "common": true,
      "keys": [
        "hp_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N095_2",
      "sourceId": 95,
      "classId": 2,
      "skill": null,
      "name": "生命上限",
      "description": "最大生命提高5%/10%/15%/20%（上限4档）。",
      "max": 4,
      "rarity": "purple",
      "common": true,
      "keys": [
        "hp_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N095_3",
      "sourceId": 95,
      "classId": 3,
      "skill": null,
      "name": "生命上限",
      "description": "最大生命提高5%/10%/15%/20%（上限4档）。",
      "max": 4,
      "rarity": "purple",
      "common": true,
      "keys": [
        "hp_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N096_0",
      "sourceId": 96,
      "classId": 0,
      "skill": null,
      "name": "攻击力",
      "description": "攻击力提高5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "attack_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N096_4",
      "sourceId": 96,
      "classId": 4,
      "skill": null,
      "name": "攻击力",
      "description": "攻击力提高5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "attack_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N096_5",
      "sourceId": 96,
      "classId": 5,
      "skill": null,
      "name": "攻击力",
      "description": "攻击力提高5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "attack_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N096_2",
      "sourceId": 96,
      "classId": 2,
      "skill": null,
      "name": "攻击力",
      "description": "攻击力提高5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "attack_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N096_3",
      "sourceId": 96,
      "classId": 3,
      "skill": null,
      "name": "攻击力",
      "description": "攻击力提高5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "attack_bonus"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N097_0",
      "sourceId": 97,
      "classId": 0,
      "skill": null,
      "name": "移动速度",
      "description": "移动速度提高25%/50%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "move_bonus"
      ],
      "values": [
        [
          0.25
        ],
        [
          0.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N097_4",
      "sourceId": 97,
      "classId": 4,
      "skill": null,
      "name": "移动速度",
      "description": "移动速度提高25%/50%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "move_bonus"
      ],
      "values": [
        [
          0.25
        ],
        [
          0.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N097_5",
      "sourceId": 97,
      "classId": 5,
      "skill": null,
      "name": "移动速度",
      "description": "移动速度提高25%/50%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "move_bonus"
      ],
      "values": [
        [
          0.25
        ],
        [
          0.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N097_2",
      "sourceId": 97,
      "classId": 2,
      "skill": null,
      "name": "移动速度",
      "description": "移动速度提高25%/50%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "move_bonus"
      ],
      "values": [
        [
          0.25
        ],
        [
          0.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N097_3",
      "sourceId": 97,
      "classId": 3,
      "skill": null,
      "name": "移动速度",
      "description": "移动速度提高25%/50%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "move_bonus"
      ],
      "values": [
        [
          0.25
        ],
        [
          0.5
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N098_0",
      "sourceId": 98,
      "classId": 0,
      "skill": null,
      "name": "受到治疗",
      "description": "受到的治疗提高5%/10%/15%/20%/25%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": true,
      "keys": [
        "healing_received"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ],
        [
          0.25
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N098_4",
      "sourceId": 98,
      "classId": 4,
      "skill": null,
      "name": "受到治疗",
      "description": "受到的治疗提高5%/10%/15%/20%/25%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": true,
      "keys": [
        "healing_received"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ],
        [
          0.25
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N098_5",
      "sourceId": 98,
      "classId": 5,
      "skill": null,
      "name": "受到治疗",
      "description": "受到的治疗提高5%/10%/15%/20%/25%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": true,
      "keys": [
        "healing_received"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ],
        [
          0.25
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N098_2",
      "sourceId": 98,
      "classId": 2,
      "skill": null,
      "name": "受到治疗",
      "description": "受到的治疗提高5%/10%/15%/20%/25%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": true,
      "keys": [
        "healing_received"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ],
        [
          0.25
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N098_3",
      "sourceId": 98,
      "classId": 3,
      "skill": null,
      "name": "受到治疗",
      "description": "受到的治疗提高5%/10%/15%/20%/25%（上限5档）。",
      "max": 5,
      "rarity": "blue",
      "common": true,
      "keys": [
        "healing_received"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ],
        [
          0.15
        ],
        [
          0.2
        ],
        [
          0.25
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N099_0",
      "sourceId": 99,
      "classId": 0,
      "skill": null,
      "name": "技能冷却缩减",
      "description": "技能冷却时间缩短5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "cdr"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N099_4",
      "sourceId": 99,
      "classId": 4,
      "skill": null,
      "name": "技能冷却缩减",
      "description": "技能冷却时间缩短5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "cdr"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N099_5",
      "sourceId": 99,
      "classId": 5,
      "skill": null,
      "name": "技能冷却缩减",
      "description": "技能冷却时间缩短5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "cdr"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N099_2",
      "sourceId": 99,
      "classId": 2,
      "skill": null,
      "name": "技能冷却缩减",
      "description": "技能冷却时间缩短5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "cdr"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N099_3",
      "sourceId": 99,
      "classId": 3,
      "skill": null,
      "name": "技能冷却缩减",
      "description": "技能冷却时间缩短5%/10%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "cdr"
      ],
      "values": [
        [
          0.05
        ],
        [
          0.1
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N100_0",
      "sourceId": 100,
      "classId": 0,
      "skill": null,
      "name": "对塔减伤",
      "description": "受到防御塔的伤害降低20%/40%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "tower_reduction"
      ],
      "values": [
        [
          0.2
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N100_4",
      "sourceId": 100,
      "classId": 4,
      "skill": null,
      "name": "对塔减伤",
      "description": "受到防御塔的伤害降低20%/40%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "tower_reduction"
      ],
      "values": [
        [
          0.2
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N100_5",
      "sourceId": 100,
      "classId": 5,
      "skill": null,
      "name": "对塔减伤",
      "description": "受到防御塔的伤害降低20%/40%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "tower_reduction"
      ],
      "values": [
        [
          0.2
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N100_2",
      "sourceId": 100,
      "classId": 2,
      "skill": null,
      "name": "对塔减伤",
      "description": "受到防御塔的伤害降低20%/40%（上限2档）。",
      "max": 2,
      "rarity": "purple",
      "common": true,
      "keys": [
        "tower_reduction"
      ],
      "values": [
        [
          0.2
        ],
        [
          0.4
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N101_0",
      "sourceId": 101,
      "classId": 0,
      "skill": null,
      "name": "攻击速度",
      "description": "攻击速度提高10%/20%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N101_4",
      "sourceId": 101,
      "classId": 4,
      "skill": null,
      "name": "攻击速度",
      "description": "攻击速度提高10%/20%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N101_5",
      "sourceId": 101,
      "classId": 5,
      "skill": null,
      "name": "攻击速度",
      "description": "攻击速度提高10%/20%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N101_2",
      "sourceId": 101,
      "classId": 2,
      "skill": null,
      "name": "攻击速度",
      "description": "攻击速度提高10%/20%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N101_3",
      "sourceId": 101,
      "classId": 3,
      "skill": null,
      "name": "攻击速度",
      "description": "攻击速度提高10%/20%（上限2档）。",
      "max": 2,
      "rarity": "blue",
      "common": true,
      "keys": [
        "haste"
      ],
      "values": [
        [
          0.1
        ],
        [
          0.2
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N102_0",
      "sourceId": 102,
      "classId": 0,
      "skill": null,
      "name": "普通攻击距离",
      "description": "普通攻击距离增加2格（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": true,
      "keys": [
        "range_bonus"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N102_4",
      "sourceId": 102,
      "classId": 4,
      "skill": null,
      "name": "普通攻击距离",
      "description": "普通攻击距离增加2格（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": true,
      "keys": [
        "range_bonus"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N102_5",
      "sourceId": 102,
      "classId": 5,
      "skill": null,
      "name": "普通攻击距离",
      "description": "普通攻击距离增加2格（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": true,
      "keys": [
        "range_bonus"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N102_2",
      "sourceId": 102,
      "classId": 2,
      "skill": null,
      "name": "普通攻击距离",
      "description": "普通攻击距离增加2格（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": true,
      "keys": [
        "range_bonus"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N102_3",
      "sourceId": 102,
      "classId": 3,
      "skill": null,
      "name": "普通攻击距离",
      "description": "普通攻击距离增加2格（上限1档）。",
      "max": 1,
      "rarity": "blue",
      "common": true,
      "keys": [
        "range_bonus"
      ],
      "values": [
        [
          2.0
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N103_0",
      "sourceId": 103,
      "classId": 0,
      "skill": null,
      "name": "最终减伤",
      "description": "受到的最终伤害降低11%/22%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_reduction"
      ],
      "values": [
        [
          0.11
        ],
        [
          0.22
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N103_4",
      "sourceId": 103,
      "classId": 4,
      "skill": null,
      "name": "最终减伤",
      "description": "受到的最终伤害降低11%/22%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_reduction"
      ],
      "values": [
        [
          0.11
        ],
        [
          0.22
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N103_5",
      "sourceId": 103,
      "classId": 5,
      "skill": null,
      "name": "最终减伤",
      "description": "受到的最终伤害降低11%/22%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_reduction"
      ],
      "values": [
        [
          0.11
        ],
        [
          0.22
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N103_2",
      "sourceId": 103,
      "classId": 2,
      "skill": null,
      "name": "最终减伤",
      "description": "受到的最终伤害降低11%/22%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_reduction"
      ],
      "values": [
        [
          0.11
        ],
        [
          0.22
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N103_3",
      "sourceId": 103,
      "classId": 3,
      "skill": null,
      "name": "最终减伤",
      "description": "受到的最终伤害降低11%/22%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_reduction"
      ],
      "values": [
        [
          0.11
        ],
        [
          0.22
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N104_0",
      "sourceId": 104,
      "classId": 0,
      "skill": null,
      "name": "最终增伤",
      "description": "造成的最终伤害提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_damage"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N104_4",
      "sourceId": 104,
      "classId": 4,
      "skill": null,
      "name": "最终增伤",
      "description": "造成的最终伤害提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_damage"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N104_5",
      "sourceId": 104,
      "classId": 5,
      "skill": null,
      "name": "最终增伤",
      "description": "造成的最终伤害提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_damage"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N104_2",
      "sourceId": 104,
      "classId": 2,
      "skill": null,
      "name": "最终增伤",
      "description": "造成的最终伤害提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_damage"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    },
    {
      "id": "N104_3",
      "sourceId": 104,
      "classId": 3,
      "skill": null,
      "name": "最终增伤",
      "description": "造成的最终伤害提高15%/30%（上限2档）。",
      "max": 2,
      "rarity": "gold",
      "common": true,
      "keys": [
        "final_damage"
      ],
      "values": [
        [
          0.15
        ],
        [
          0.3
        ]
      ],
      "baseline": [
        0
      ]
    }
  ],
  "qualityWeights": {
    "blue": 1,
    "purple": 1,
    "gold": 1
  },
  "qualityStatus": "待按总体平均升级收益校准；当前为等权开发占位",
  "rules": {
    "expPerStamina": 100,
    "levelUpStamina": [...LEVEL_UP_STAMINA],
    "maxLevel": 40,
    "initialLevel": 0,
    "contractCost": 3,
    "initialHeat": 1,
    "heatCap": 10,
    "heatDuration": 10,
    "heatHaste": 0.05,
    "heatHealPenalty": 0.02,
    "heatAttackCap": 0.2,
    "heatBoostDuration": 5,
    "elfDamageHeal": 0.5,
    "elfHealDamage": 0.5,
    "elfConvertRadius": 4,
    "orcMissingReduction": 0.25,
    "lordMinionKills": 3,
    "lordKillHeal": 0.02,
    "lordPassiveThreshold": 0.1,
    "lordPassiveReduction": 0.08,
    "lordPassiveDuration": 5,
    "shareTotals": [
      0,
      1,
      0.9,
      0.8,
      0.7,
      0.6,
      0.5
    ],
    "echoDelay": 1,
    "explosionDelay": 1,
    "pierceSpeed": 2.5,
    "pierceDistance": 12,
    "pierceRadius": 1.5,
    "pierceGap": 0.6,
    "piercePower": 0.4,
    "summonHp": 2000,
    "summonAttack": 180,
    "summonInterval": 1.5,
    "standardStamina": 21,
    "staminaPoints": 100,
    "heroKillPoints": 200,
    "heroAssistPoints": 100
  },
  "scoreCoefficients": {
    "0": {
      "a": 0.128645,
      "b": 0.037252,
      "c": 0.094751
    },
    "4": {
      "a": 0.069159,
      "b": 0.001383,
      "c": 0.01729
    },
    "5": {
      "a": 0.085337,
      "b": 0.001707,
      "c": 0.060041
    },
    "2": {
      "a": 0.104652,
      "b": 0.002093,
      "c": 0.026163
    },
    "3": {
      "a": 0.043091,
      "b": 0.00508,
      "c": 0.010773
    }
  }
};
