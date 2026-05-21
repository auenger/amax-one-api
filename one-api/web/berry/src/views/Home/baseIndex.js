import { Box, Typography, Stack, GlobalStyles } from '@mui/material';

const styles = {
  hero: {
    position: 'relative',
    width: '100%',
    height: 'calc(100vh - 124px)',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(160deg, #0a0e27 0%, #111b47 40%, #0d1b3e 70%, #0a0e27 100%)',
    overflow: 'hidden',
    p: 0,
    m: 0
  },
  heroBefore: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,125,249,0.15) 0%, transparent 70%)',
    top: -200,
    left: -100,
    pointerEvents: 'none'
  },
  heroAfter: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
    bottom: -150,
    right: -100,
    pointerEvents: 'none'
  },
  heroContent: {
    maxWidth: 1200,
    mx: 'auto',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    zIndex: 2,
    px: 4
  },
  heroText: { flex: 1, maxWidth: 580 },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    py: 0.75,
    px: 2,
    borderRadius: 50,
    border: '1px solid rgba(79,125,249,0.4)',
    background: 'rgba(79,125,249,0.08)',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#7da3fc',
    mb: 3
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#4f7df9',
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: -3,
      borderRadius: '50%',
      border: '2px solid #4f7df9',
      animation: 'badge-pulse 2s ease-in-out infinite'
    }
  },
  line1: {
    display: 'block',
    color: 'rgba(224,230,240,0.6)',
    fontSize: { xs: '1.2rem', md: '1.8rem' },
    fontWeight: 500,
    letterSpacing: '0.05em',
    mb: 1
  },
  line2: {
    display: 'block',
    background: 'linear-gradient(90deg, #4f7df9 0%, #a78bfa 50%, #4f7df9 100%)',
    backgroundSize: '200% 100%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'gradient-shift 4s ease infinite'
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'rgba(224,230,240,0.65)',
    lineHeight: 1.7,
    mb: 3,
    maxWidth: 480
  },
  protocolTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    py: 1,
    px: 2,
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace"
  },
  svgContainer: {
    position: 'absolute',
    top: '240px',
    right: '100px',
    width: 'min(520px, 45vw)',
    pointerEvents: 'none',
    zIndex: 1,
    display: { xs: 'none', md: 'block' }
  }
};

const BaseIndex = () => (
  <>
    <GlobalStyles styles={{
      '@keyframes badge-pulse': {
        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
        '50%': { opacity: 0, transform: 'scale(2)' }
      },
      '@keyframes gradient-shift': {
        '0%, 100%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' }
      }
    }} />
    <Box sx={styles.hero}>
      <Box sx={styles.heroBefore} />
      <Box sx={styles.heroAfter} />

      {/* SVG Network */}
      <Box sx={styles.svgContainer} aria-hidden="true">
        <svg viewBox="-20 -20 380 340" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.85 }}>
          <defs>
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4f7df9" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ng-openai" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10a37f" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10a37f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ng-anthropic" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ng-google" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4285f4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#4285f4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ng-aws" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff9900" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ng-glm" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ng-minimax" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
            <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-strong" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="8" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-openai" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-anthropic" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Orbit ellipses */}
          <ellipse cx="190" cy="150" rx="140" ry="125" stroke="#4f7df9" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="2 14" transform="rotate(-5 190 150)" />
          <ellipse cx="190" cy="150" rx="105" ry="92" stroke="#7c3aed" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="3 10" transform="rotate(8 190 150)" />
          <ellipse cx="190" cy="150" rx="70" ry="62" stroke="#4f7df9" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="2 8" transform="rotate(-10 190 150)" />

          {/* Connection lines: outer → center */}
          <path id="q-openai" d="M55,42 Q120,90 190,150" style={{ display: 'none' }} />
          <path id="q-anthropic" d="M290,48 Q248,95 190,150" style={{ display: 'none' }} />
          <path id="q-google" d="M320,175 Q260,165 190,150" style={{ display: 'none' }} />
          <path id="q-aws" d="M240,278 Q220,220 190,150" style={{ display: 'none' }} />
          <path id="q-glm" d="M60,265 Q115,215 190,150" style={{ display: 'none' }} />
          <path id="q-minimax" d="M22,152 Q100,140 190,150" style={{ display: 'none' }} />

          <path d="M55,42 Q120,90 190,150" stroke="#10a37f" strokeOpacity="0.2" strokeWidth="1" fill="none" />
          <path d="M290,48 Q248,95 190,150" stroke="#d97706" strokeOpacity="0.2" strokeWidth="1" fill="none" />
          <path d="M320,175 Q260,165 190,150" stroke="#4285f4" strokeOpacity="0.2" strokeWidth="1" fill="none" />
          <path d="M240,278 Q220,220 190,150" stroke="#ff9900" strokeOpacity="0.2" strokeWidth="1" fill="none" />
          <path d="M60,265 Q115,215 190,150" stroke="#06b6d4" strokeOpacity="0.2" strokeWidth="1" fill="none" />
          <path d="M22,152 Q100,140 190,150" stroke="#f43f5e" strokeOpacity="0.2" strokeWidth="1" fill="none" />

          {/* Outer ring connections */}
          <path d="M55,42 Q170,18 290,48" stroke="#4f7df9" strokeOpacity="0.08" strokeWidth="1" fill="none" />
          <path d="M290,48 Q318,110 320,175" stroke="#4f7df9" strokeOpacity="0.08" strokeWidth="1" fill="none" />
          <path d="M320,175 Q290,235 240,278" stroke="#4f7df9" strokeOpacity="0.08" strokeWidth="1" fill="none" />
          <path d="M240,278 Q150,290 60,265" stroke="#4f7df9" strokeOpacity="0.08" strokeWidth="1" fill="none" />
          <path d="M60,265 Q30,210 22,152" stroke="#4f7df9" strokeOpacity="0.08" strokeWidth="1" fill="none" />
          <path d="M22,152 Q28,85 55,42" stroke="#4f7df9" strokeOpacity="0.08" strokeWidth="1" fill="none" />

          {/* Mid ring connections */}
          <path d="M120,50 Q150,95 190,150" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
          <path d="M270,88 Q235,115 190,150" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
          <path d="M275,205 Q240,180 190,150" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
          <path d="M178,252 Q182,205 190,150" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
          <path d="M88,210 Q130,185 190,150" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
          <path d="M75,108 Q128,125 190,150" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />

          {/* Center glow */}
          <circle cx="190" cy="150" r="60" fill="url(#core-glow)" />

          {/* Outer node halos */}
          <circle cx="55" cy="42" r="55" fill="url(#ng-openai)" fillOpacity="0.25" />
          <circle cx="290" cy="48" r="50" fill="url(#ng-anthropic)" fillOpacity="0.25" />
          <circle cx="320" cy="175" r="50" fill="url(#ng-google)" fillOpacity="0.2" />
          <circle cx="240" cy="278" r="50" fill="url(#ng-aws)" fillOpacity="0.2" />
          <circle cx="60" cy="265" r="50" fill="url(#ng-glm)" fillOpacity="0.2" />
          <circle cx="22" cy="152" r="50" fill="url(#ng-minimax)" fillOpacity="0.2" />

          {/* Outer nodes */}
          <circle cx="55" cy="42" r="8" fill="#10a37f" fillOpacity="0.2" stroke="#10a37f" strokeOpacity="0.7" strokeWidth="1.5" filter="url(#glow-openai)" />
          <circle cx="290" cy="48" r="8" fill="#d97706" fillOpacity="0.2" stroke="#d97706" strokeOpacity="0.7" strokeWidth="1.5" filter="url(#glow-anthropic)" />
          <circle cx="320" cy="175" r="7.5" fill="#4285f4" fillOpacity="0.2" stroke="#4285f4" strokeOpacity="0.6" strokeWidth="1.5" filter="url(#glow)" />
          <circle cx="240" cy="278" r="7.5" fill="#ff9900" fillOpacity="0.2" stroke="#ff9900" strokeOpacity="0.6" strokeWidth="1.5" filter="url(#glow)" />
          <circle cx="60" cy="265" r="7.5" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeOpacity="0.6" strokeWidth="1.5" filter="url(#glow)" />
          <circle cx="22" cy="152" r="7.5" fill="#f43f5e" fillOpacity="0.2" stroke="#f43f5e" strokeOpacity="0.6" strokeWidth="1.5" filter="url(#glow)" />

          {/* Pulse rings */}
          <circle cx="55" cy="42" r="8" fill="none" stroke="#10a37f" strokeOpacity="0.4" strokeWidth="4">
            <animate attributeName="r" values="8;22;8" dur="4s" repeatCount="indefinite" begin="0s" />
            <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="4s" repeatCount="indefinite" begin="0s" />
          </circle>
          <circle cx="290" cy="48" r="8" fill="none" stroke="#d97706" strokeOpacity="0.4" strokeWidth="4">
            <animate attributeName="r" values="8;22;8" dur="4s" repeatCount="indefinite" begin="0.7s" />
            <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="4s" repeatCount="indefinite" begin="0.7s" />
          </circle>
          <circle cx="320" cy="175" r="7" fill="none" stroke="#4285f4" strokeOpacity="0.35" strokeWidth="4">
            <animate attributeName="r" values="7;20;7" dur="4s" repeatCount="indefinite" begin="1.4s" />
            <animate attributeName="stroke-opacity" values="0.35;0;0.35" dur="4s" repeatCount="indefinite" begin="1.4s" />
          </circle>
          <circle cx="240" cy="278" r="7" fill="none" stroke="#ff9900" strokeOpacity="0.35" strokeWidth="4">
            <animate attributeName="r" values="7;20;7" dur="4s" repeatCount="indefinite" begin="2.1s" />
            <animate attributeName="stroke-opacity" values="0.35;0;0.35" dur="4s" repeatCount="indefinite" begin="2.1s" />
          </circle>
          <circle cx="60" cy="265" r="7" fill="none" stroke="#06b6d4" strokeOpacity="0.35" strokeWidth="4">
            <animate attributeName="r" values="7;20;7" dur="4s" repeatCount="indefinite" begin="2.8s" />
            <animate attributeName="stroke-opacity" values="0.35;0;0.35" dur="4s" repeatCount="indefinite" begin="2.8s" />
          </circle>
          <circle cx="22" cy="152" r="7" fill="none" stroke="#f43f5e" strokeOpacity="0.35" strokeWidth="4">
            <animate attributeName="r" values="7;20;7" dur="4s" repeatCount="indefinite" begin="3.5s" />
            <animate attributeName="stroke-opacity" values="0.35;0;0.35" dur="4s" repeatCount="indefinite" begin="3.5s" />
          </circle>

          {/* Mid nodes */}
          <circle cx="120" cy="50" r="5" fill="#7c3aed" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="270" cy="88" r="5" fill="#4f7df9" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="275" cy="205" r="5" fill="#4285f4" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="178" cy="252" r="5" fill="#ff9900" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="88" cy="210" r="5" fill="#06b6d4" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="75" cy="108" r="5" fill="#f43f5e" fillOpacity="0.9" filter="url(#glow)" />

          {/* Inner nodes */}
          <circle cx="162" cy="92" r="4" fill="#4f7df9" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="232" cy="118" r="4" fill="#4f7df9" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="238" cy="185" r="4" fill="#7c3aed" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="185" cy="210" r="4" fill="#7c3aed" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="140" cy="188" r="4" fill="#4f7df9" fillOpacity="0.9" filter="url(#glow)" />
          <circle cx="135" cy="120" r="4" fill="#7c3aed" fillOpacity="0.9" filter="url(#glow)" />

          {/* Center core */}
          <circle cx="190" cy="150" r="24" fill="#4f7df9" fillOpacity="0.06" stroke="#4f7df9" strokeOpacity="0.15" strokeWidth="1" />
          <circle cx="190" cy="150" r="15" fill="#4f7df9" fillOpacity="0.15" stroke="#4f7df9" strokeOpacity="0.45" strokeWidth="1.5" />
          <circle cx="190" cy="150" r="7" fill="#4f7df9" filter="url(#glow-strong)" />
          <circle cx="190" cy="150" r="15" fill="none" stroke="#4f7df9" strokeOpacity="0.35" strokeWidth="7">
            <animate attributeName="r" values="15;30;15" dur="3s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.35;0;0.35" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Flowing particles */}
          <circle r="2.5" fill="#10a37f" fillOpacity="0.9" filter="url(#glow-openai)">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="0s"><mpath href="#q-openai" /></animateMotion>
          </circle>
          <circle r="2.5" fill="#d97706" fillOpacity="0.9" filter="url(#glow-anthropic)">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.5s"><mpath href="#q-anthropic" /></animateMotion>
          </circle>
          <circle r="2.5" fill="#4285f4" fillOpacity="0.9" filter="url(#glow)">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="1s"><mpath href="#q-google" /></animateMotion>
          </circle>
          <circle r="2.5" fill="#ff9900" fillOpacity="0.9" filter="url(#glow)">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="1.5s"><mpath href="#q-aws" /></animateMotion>
          </circle>
          <circle r="2.5" fill="#06b6d4" fillOpacity="0.9" filter="url(#glow)">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="2s"><mpath href="#q-glm" /></animateMotion>
          </circle>
          <circle r="2.5" fill="#f43f5e" fillOpacity="0.9" filter="url(#glow)">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="2.5s"><mpath href="#q-minimax" /></animateMotion>
          </circle>
          {/* Return particles */}
          <circle r="2" fill="#10a37f" fillOpacity="0.5">
            <animateMotion dur="4s" repeatCount="indefinite" begin="1s" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#q-openai" /></animateMotion>
          </circle>
          <circle r="2" fill="#d97706" fillOpacity="0.5">
            <animateMotion dur="4s" repeatCount="indefinite" begin="2.5s" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#q-anthropic" /></animateMotion>
          </circle>
          {/* Mid-ring particles */}
          <path id="qm1" d="M120,50 Q190,55 270,88" style={{ display: 'none' }} />
          <path id="qm2" d="M275,205 Q235,235 178,252" style={{ display: 'none' }} />
          <path id="qm3" d="M88,210 Q70,160 75,108" style={{ display: 'none' }} />
          <circle r="2" fill="#7c3aed" fillOpacity="0.8" filter="url(#glow)">
            <animateMotion dur="2s" repeatCount="indefinite" begin="0.2s"><mpath href="#qm1" /></animateMotion>
          </circle>
          <circle r="2" fill="#ff9900" fillOpacity="0.8" filter="url(#glow)">
            <animateMotion dur="2.2s" repeatCount="indefinite" begin="0.9s"><mpath href="#qm2" /></animateMotion>
          </circle>
          <circle r="2" fill="#4285f4" fillOpacity="0.8" filter="url(#glow)">
            <animateMotion dur="1.8s" repeatCount="indefinite" begin="1.5s"><mpath href="#qm3" /></animateMotion>
          </circle>

          {/* Labels */}
          <text x="55" y="28" textAnchor="middle" fontSize="7" fill="#10a37f" fillOpacity="0.7" fontFamily="monospace">OpenAI</text>
          <text x="305" y="42" textAnchor="start" fontSize="7" fill="#d97706" fillOpacity="0.7" fontFamily="monospace">Anthropic</text>
          <text x="330" y="180" textAnchor="start" fontSize="7" fill="#4285f4" fillOpacity="0.7" fontFamily="monospace">Google</text>
          <text x="245" y="295" textAnchor="middle" fontSize="7" fill="#ff9900" fillOpacity="0.7" fontFamily="monospace">AWS</text>
          <text x="48" y="282" textAnchor="end" fontSize="7" fill="#06b6d4" fillOpacity="0.7" fontFamily="monospace">GLM</text>
          <text x="12" y="148" textAnchor="end" fontSize="7" fill="#f43f5e" fillOpacity="0.7" fontFamily="monospace">MiniMax</text>
          <text x="190" y="153" textAnchor="middle" fontSize="6.5" fill="#4f7df9" fillOpacity="0.95" fontFamily="monospace" fontWeight="bold">AIHub</text>
        </svg>
      </Box>

      {/* Hero text content */}
      <Box sx={styles.heroContent}>
        <Box sx={styles.heroText}>
          <Box sx={styles.heroBadge}>
            <Box sx={styles.pulseDot} />
            多模型 All-in-One AI 管理平台
          </Box>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', mb: 3 }}>
            <Typography component="span" sx={styles.line1}>一个入口，聚合一切 AI 能力</Typography>
            <Typography component="span" sx={{ ...styles.line2, fontSize: 'inherit', fontWeight: 'inherit' }}>统一 API 网关</Typography>
          </Typography>
          <Typography sx={styles.subtitle}>
            企业级 AI 管理平台，同时兼容 OpenAI 和 Anthropic 协议标准。38 家供应商统一接入，智能路由、并发追踪、配额监控，开箱即用。
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ ...styles.protocolTag, background: 'rgba(16,163,127,0.12)', border: '1px solid rgba(16,163,127,0.3)', color: '#10a37f' }}>
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#10a37f" d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" /></svg>
              OpenAI
            </Box>
            <Box sx={{ ...styles.protocolTag, background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.3)', color: '#d97706' }}>
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#d97706" d="M17.304 3.541l-5.357 16.918H8.698L14.052 3.54h3.252zm-7.058 0L4.89 20.459H8.14l5.357-16.918h-3.252z" /></svg>
              Anthropic
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  </>
);

export default BaseIndex;
