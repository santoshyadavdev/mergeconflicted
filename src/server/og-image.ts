import satori from '@cf-wasm/satori';
import { Resvg } from '@cf-wasm/resvg';

const WIDTH = 1200;
const HEIGHT = 630;

const FONT_CACHE = new Map<string, ArrayBuffer>();

async function loadFont(weight: 400 | 700): Promise<ArrayBuffer> {
  const key = `inter-${weight}`;
  const cached = FONT_CACHE.get(key);
  if (cached) return cached;

  const url = `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf`;
  const boldUrl = `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf`;

  const resp = await fetch(weight === 700 ? boldUrl : url);
  const buffer = await resp.arrayBuffer();
  FONT_CACHE.set(key, buffer);
  return buffer;
}

interface OgImageData {
  username: string;
  archetype: string;
  emoji: string;
  tagline: string;
  avatarUrl: string;
}

function buildMarkup(data: OgImageData) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0a1a 0%, #1a1035 40%, #0d1b2a 100%)',
        padding: '60px',
        fontFamily: 'Inter',
        color: '#ffffff',
      },
      children: [
        // Top: site name
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '40px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: { fontSize: '24px', color: '#a78bfa', fontWeight: 700 },
                  children: 'MergeConflicted',
                },
              },
            ],
          },
        },
        // Center: main content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              gap: '48px',
            },
            children: [
              // Avatar
              {
                type: 'img',
                props: {
                  src: data.avatarUrl,
                  width: 180,
                  height: 180,
                  style: {
                    borderRadius: '90px',
                    border: '4px solid #a78bfa',
                  },
                },
              },
              // Text block
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: '12px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: '28px', color: '#9ca3af' },
                        children: `@${data.username}`,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                        },
                        children: [
                          {
                            type: 'span',
                            props: {
                              style: { fontSize: '56px' },
                              children: data.emoji,
                            },
                          },
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: '48px',
                                fontWeight: 700,
                                background: 'linear-gradient(90deg, #c084fc, #f472b6)',
                                backgroundClip: 'text',
                                color: 'transparent',
                              },
                              children: data.archetype,
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '24px',
                          color: '#d1d5db',
                          fontStyle: 'italic',
                        },
                        children: `"${data.tagline}"`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Bottom: CTA
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '20px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: { fontSize: '20px', color: '#6b7280' },
                  children: 'mergeconflicted.dev',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function buildDefaultMarkup() {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0a1a 0%, #1a1035 40%, #0d1b2a 100%)',
        padding: '60px',
        fontFamily: 'Inter',
        color: '#ffffff',
        gap: '24px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontSize: '72px' },
            children: '🔍',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '56px',
              fontWeight: 700,
              textAlign: 'center',
              background: 'linear-gradient(90deg, #c084fc, #f472b6)',
              backgroundClip: 'text',
              color: 'transparent',
            },
            children: 'What kind of reviewer are you?',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '28px',
              color: '#9ca3af',
              textAlign: 'center',
            },
            children: 'Discover your code review personality based on your GitHub activity',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '22px',
              color: '#6b7280',
              marginTop: '20px',
            },
            children: 'mergeconflicted.dev',
          },
        },
      ],
    },
  };
}

export async function generateOgImage(data?: OgImageData): Promise<Uint8Array> {
  const [regular, bold] = await Promise.all([loadFont(400), loadFont(700)]);

  const markup = data ? buildMarkup(data) : buildDefaultMarkup();

  const svg = await satori(markup, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}
