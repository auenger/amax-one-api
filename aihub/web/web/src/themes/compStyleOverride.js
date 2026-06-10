export default function componentStyleOverrides(theme) {
  const bgColor = theme.mode === 'dark' ? theme.colors?.darkLevel1 : theme.colors?.grey50;
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: '8px',
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          },
          '&.Mui-disabled': {
            color: theme.colors?.grey400
          }
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: theme.colors?.primaryDark
          }
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: theme.colors?.secondaryDark
          }
        }
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        popper: {
          boxShadow: '0px 4px 16px rgba(0,0,0,0.08)',
          borderRadius: `${theme?.customization?.borderRadius}px`
        },
        listbox: {
          padding: '4px'
        },
        option: {
          fontSize: '0.875rem',
          fontWeight: 400,
          borderRadius: '6px',
          alignItems: 'center',
          paddingTop: '6px',
          paddingBottom: '6px',
          paddingLeft: '12px',
          paddingRight: '12px',
          margin: '2px 4px',
          '&[aria-selected="true"]': {
            backgroundColor: theme.colors?.primaryLight + ' !important',
            color: theme.colors?.primaryDark
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: theme.darkTextPrimary,
          borderRadius: '8px',
          '&:hover': {
            backgroundColor: theme.mode === 'dark'
              ? 'rgba(148, 163, 184, 0.1)'
              : theme.colors?.grey100
          }
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        },
        rounded: {
          borderRadius: `${theme?.customization?.borderRadius}px`
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          color: theme.colors?.textDark,
          padding: '20px 24px'
        },
        title: {
          fontSize: '1.125rem',
          fontWeight: 600
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px'
        }
      }
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px'
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: theme.darkTextPrimary,
          paddingTop: '10px',
          paddingBottom: '10px',
          borderRadius: '8px',
          margin: '2px 8px',
          '&.Mui-selected': {
            color: theme.menuSelected,
            backgroundColor: theme.menuSelectedBack,
            '&:hover': {
              backgroundColor: theme.menuSelectedBack
            },
            '& .MuiListItemIcon-root': {
              color: theme.menuSelected
            }
          },
          '&:hover': {
            backgroundColor: theme.menuSelectedBack,
            color: theme.menuSelected,
            '& .MuiListItemIcon-root': {
              color: theme.menuSelected
            }
          }
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: theme.darkTextPrimary,
          minWidth: '36px'
        }
      }
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: theme.textDark,
          fontSize: '0.875rem',
          fontWeight: 500
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          color: theme.textDark,
          '&::placeholder': {
            color: theme.colors?.grey400,
            fontSize: '0.875rem',
            opacity: 1
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: bgColor,
          borderRadius: `${theme?.customization?.borderRadius}px`,
          transition: 'all 0.2s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.colors?.grey300
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.colors?.primaryMain
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.colors?.primaryMain,
            borderWidth: '2px'
          },
          '&.MuiInputBase-multiline': {
            padding: 1
          }
        },
        input: {
          fontWeight: 400,
          background: bgColor,
          padding: '14.5px 14px',
          borderRadius: `${theme?.customization?.borderRadius}px`,
          '&.MuiInputBase-inputSizeSmall': {
            padding: '8px 14px',
            '&.MuiInputBase-inputAdornedStart': {
              paddingLeft: 0
            }
          }
        },
        inputAdornedStart: {
          paddingLeft: 4
        },
        notchedOutline: {
          borderRadius: `${theme?.customization?.borderRadius}px`
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            color: theme.colors?.grey300
          }
        },
        mark: {
          backgroundColor: theme.paper,
          width: '4px'
        },
        valueLabel: {
          color: theme?.colors?.primaryLight
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.divider,
          opacity: 1
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          color: theme.colors?.primaryDark,
          background: theme.colors?.primary200,
          fontWeight: 600
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
          '&.MuiChip-deletable .MuiChip-deleteIcon': {
            color: 'inherit'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid ' + theme.tableBorderBottom,
          padding: '14px 16px',
          textAlign: 'left'
        },
        head: {
          color: theme.darkTextSecondary,
          fontSize: '0.8125rem',
          fontWeight: 600,
          backgroundColor: theme.headBackgroundColor,
          textTransform: 'none',
          letterSpacing: '0'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: theme.mode === 'dark'
              ? 'rgba(148, 163, 184, 0.04)'
              : theme.colors?.grey50
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: theme.colors?.grey50,
          background: theme.colors?.grey900,
          borderRadius: '6px',
          fontSize: '0.75rem',
          padding: '6px 12px'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: `${theme?.customization?.borderRadius}px`,
          alignItems: 'center'
        },
        standardInfo: {
          backgroundColor: theme.colors?.primaryLight,
          color: theme.colors?.primaryDark
        },
        standardSuccess: {
          backgroundColor: theme.colors?.successLight,
          color: theme.colors?.successDark
        },
        standardWarning: {
          backgroundColor: theme.colors?.warningLight,
          color: theme.colors?.warningDark
        },
        standardError: {
          backgroundColor: theme.colors?.errorLight,
          color: theme.colors?.errorDark
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: `${theme?.customization?.borderRadius + 4}px`
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: `
      .apexcharts-title-text {
          fill: ${theme.textDark} !important
        }
      .apexcharts-text {
        fill: ${theme.textDark} !important
      }
      .apexcharts-legend-text {
        color: ${theme.textDark} !important
      }
      .apexcharts-menu {
        background: ${theme.backgroundDefault} !important;
        border-radius: ${theme?.customization?.borderRadius}px !important;
        box-shadow: 0px 4px 16px rgba(0,0,0,0.08) !important;
      }
      .apexcharts-gridline, .apexcharts-xaxistooltip-background, .apexcharts-yaxistooltip-background {
        stroke: ${theme.divider} !important;
      }
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: ${theme.colors?.grey300};
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${theme.colors?.grey400};
      }
      `
    }
  };
}
