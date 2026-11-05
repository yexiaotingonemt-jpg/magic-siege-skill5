export const RARITIES = {
  white: { name: '白色', color: '#e6e8e3' },
  green: { name: '绿色', color: '#84d99a' },
  blue: { name: '蓝色', color: '#78bdff' },
  purple: { name: '紫色', color: '#c79aff' },
  gold: { name: '金色', color: '#f4ce77' },
};

export const UPGRADE_POOLS = {
  normal: ['white', 'green', 'blue', 'purple'],
  advanced: ['purple', 'gold'],
};
export const upgradeTypeAt = level => level > 0 && level % 5 === 0 ? 'advanced' : 'normal';

// 旧蓝色基础词条的五品质分类；仅调整抽取分类，效果、档位和ID保留。
// 最终边际收益与概率仍待平衡，不将开发分类当作强度验收。
export const AFFIX_QUALITY_OVERRIDES = Object.fromEntries([
  ...[97, 98].map(id => [id, 'white']),
  ...[0, 4, 16, 20, 24, 29, 33, 45, 52, 53, 56, 60, 71, 101, 102].map(id => [id, 'green']),
]);
