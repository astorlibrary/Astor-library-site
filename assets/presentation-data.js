// Add future exported-slide presentations here. The folder contains 1.png,
// 2.png, 3.png and so on; `folder` must end in a slash.
export const presentations = {
  'romeo-and-juliet': {
    title: 'Romeo and Juliet: Summary Guide',
    folder: '/assets/presentations/romeo-and-juliet/',
    backdrop: '/assets/presentations/romeo-and-juliet/backdrop.webp',
    slideCount: 20
  }
};

export function getPresentation(slug) {
  return presentations[slug] || presentations[Object.keys(presentations)[0]];
}
