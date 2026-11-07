import { site as profile } from './site.config.js';
import { artwork } from './artwork.js';

const collection = (id, number, title, english, category, description, coverName, tone, tags) => {
  const images = artwork.filter(image => image.group === id);
  const cover = images.find(image => image.title === coverName) || images[0];
  return { id, number, title, english, category, description, cover, images, tone, tags };
};

export const portfolio = {
  brandName: 'Yuli Studio',
  name: profile.name, englishName: profile.englishName, role: profile.role,
  email: profile.email, phone: profile.phone, about: profile.about,
  pdf: 'output/pdf/selected-works.pdf', edition: '2026', artwork,
  filters: ['全部作品', '三维渲染', '电商视觉', '平面海报', 'AI 探索'],
  projects: [
    collection('magnetic-keyboard', '01', '磁轴键盘 · 性能的视觉语言', 'Precision, made visible.', '三维渲染', '让速度、结构与手感，在画面中有迹可循。', '1 (1)', '#071120', ['产品渲染', '材质与灯光', '卖点表达']),
    collection('gaming-mouse', '02', '电竞鼠标 · 为操控而设计', 'A different point of view.', '三维渲染', '从整体形态到细节，让每一次操控都有质感。', '展示', '#09121f', ['产品渲染', '场景设计', '细节表现']),
    collection('campaign-banners', '03', '品牌 Banner · 第一眼的吸引力', 'Make the first look count.', '电商视觉', '用光影与色彩，在有限的画幅里建立鲜明印象。', 'Banner', '#240909', ['品牌视觉', '活动创意', '横幅设计']),
    collection('mechanical-keyboard', '04', '机械键盘 · 从结构到体验', 'Every detail has a purpose.', '三维渲染', '拆解结构、呈现工艺，让产品价值被清晰理解。', '三色海报', '#e7e7e5', ['结构爆炸图', '功能可视化', '系列设计']),
    collection('amazon-aplus', '05', 'Amazon A+ · 让内容连接购买', 'A story worth scrolling.', '电商视觉', '在连贯的阅读节奏里，组织产品信息与场景表达。', 'A+ (1)', '#e7e2da', ['Amazon A+', '信息层级', '长页设计']),
    collection('product-pages', '06', '电商详情 · 从兴趣到理解', 'Designed for the details.', '电商视觉', '让卖点、使用场景与细节，在同一套视觉中展开。', '详情页 (3)', '#e8e5df', ['国内平台', '详情页', '产品叙事']),
    collection('campaign-posters', '07', '主题海报 · 放大产品个性', 'A little more expression.', '平面海报', '以明确的主题、构图与色彩，创造有记忆点的表达。', '海报-3', '#cdd8dc', ['视觉创意', '海报设计', '主题表达']),
    collection('ai-experiments', '08', 'AI 探索 · 画面之外的可能', 'What if we went further?', 'AI 探索', '以 AI 练习探索新的场景、情绪与视觉方向。', 'AI生成-1', '#151515', ['AI 视觉练习', '概念探索', '场景生成']),
    collection('visual-upgrade', '09', '页面焕新 · 统一品牌体验', 'One brand. A clearer voice.', '电商视觉', '梳理页面视觉与内容秩序，连接店铺和独立站的表达。', '独立站网页视觉优化', '#cfdce6', ['独立站', '店铺视觉', '页面优化']),
  ],
};
