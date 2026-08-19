/** 无名同伴豆人：扁圆身 + 从肩长出的细肢。有名字的故事人物不要用这个，走 dicebear_svg。 */
export function beanConnected(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#1e3a5f" stroke-width="2.2" stroke-linecap="round">
    <ellipse cx="0" cy="18" rx="11" ry="13" fill="#2f4a73" stroke="none"/>
    <circle cx="-4" cy="12" r="1.6" fill="#fff" stroke="none"/>
    <circle cx="4" cy="12" r="1.6" fill="#fff" stroke="none"/>
    <path d="M-9 14 L-18 28 M9 14 L18 28 M-5 30 L-8 46 M5 30 L8 46"/>
  </g>`;
}
