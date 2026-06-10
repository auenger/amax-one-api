/**
 * Modern typography for ModelHub
 * @param {JsonObject} theme theme customization object
 */

export default function themeTypography(theme) {
  return {
    fontFamily: theme?.customization?.fontFamily,
    h6: {
      fontWeight: 600,
      color: theme.heading,
      fontSize: '0.875rem'
    },
    h5: {
      fontSize: '1rem',
      color: theme.heading,
      fontWeight: 600
    },
    h4: {
      fontSize: '1.125rem',
      color: theme.heading,
      fontWeight: 600
    },
    h3: {
      fontSize: '1.375rem',
      color: theme.heading,
      fontWeight: 600
    },
    h2: {
      fontSize: '1.625rem',
      color: theme.heading,
      fontWeight: 700
    },
    h1: {
      fontSize: '2.125rem',
      color: theme.heading,
      fontWeight: 700
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: theme.textDark
    },
    subtitle2: {
      fontSize: '0.75rem',
      fontWeight: 500,
      color: theme.darkTextSecondary
    },
    caption: {
      fontSize: '0.75rem',
      color: theme.darkTextSecondary,
      fontWeight: 400
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: '1.5em'
    },
    body2: {
      letterSpacing: '0em',
      fontWeight: 400,
      lineHeight: '1.5em',
      color: theme.darkTextPrimary
    },
    button: {
      textTransform: 'capitalize',
      fontWeight: 600
    },
    customInput: {
      marginTop: 1,
      marginBottom: 1,
      '& > label': {
        top: 23,
        left: 0,
        color: theme.grey500,
        '&[data-shrink="false"]': {
          top: 5
        }
      },
      '& > div > input': {
        padding: '30.5px 14px 11.5px !important'
      },
      '& legend': {
        display: 'none'
      },
      '& fieldset': {
        top: 0
      }
    },
    otherInput: {
      marginTop: 1,
      marginBottom: 1
    },
    mainContent: {
      backgroundColor: theme.background,
      width: '100%',
      minHeight: 'calc(100vh - 80px)',
      flexGrow: 1,
      padding: '24px',
      marginTop: '80px',
      marginRight: '24px',
      borderRadius: `${theme?.customization?.borderRadius}px`
    },
    menuCaption: {
      fontSize: '0.8125rem',
      fontWeight: 600,
      color: theme.heading,
      padding: '8px 6px 4px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginTop: '8px'
    },
    subMenuCaption: {
      fontSize: '0.6875rem',
      fontWeight: 500,
      color: theme.darkTextSecondary,
      textTransform: 'capitalize'
    },
    commonAvatar: {
      cursor: 'pointer',
      borderRadius: '8px'
    },
    smallAvatar: {
      width: '24px',
      height: '24px',
      fontSize: '1rem'
    },
    mediumAvatar: {
      width: '36px',
      height: '36px',
      fontSize: '1.2rem'
    },
    largeAvatar: {
      width: '44px',
      height: '44px',
      fontSize: '1.5rem'
    },
    menuButton: {
      color: theme.menuButtonColor,
      background: theme.menuButton
    },
    menuChip: {
      background: theme.menuChip
    },
    CardWrapper: {
      backgroundColor: theme.mode === 'dark' ? theme.colors.darkLevel2 : theme.colors.primaryDark
    },
    SubCard: {
      border: theme.mode === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.2)'
        : '1px solid rgb(226, 232, 240)'
    }
  };
}
