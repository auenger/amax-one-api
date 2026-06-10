export function getLastSevenDays() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();

    const formattedDate = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    dates.push(formattedDate);
  }
  return dates;
}

// Generate 24 hour labels: "00:00" through "23:00"
export function get24Hours() {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(String(i).padStart(2, '0') + ':00');
  }
  return hours;
}

// Generate day labels for a given date range (inclusive)
// e.g. getDaysInRange("2026-05-13", "2026-05-19") => ["2026-05-13", ..., "2026-05-19"]
export function getDaysInRange(startStr, endStr) {
  const dates = [];
  const d = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while (d <= end) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function getTodayDay() {
  let today = new Date();
  return today.toISOString().slice(0, 10);
}

export function generateChartOptions(data, unit) {
  const dates = data.map((item) => item.date);
  const values = data.map((item) => item.value);

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  return {
    series: [
      {
        data: values
      }
    ],
    type: 'line',
    height: 90,
    options: {
      chart: {
        sparkline: {
          enabled: true
        },
        background: 'transparent'
      },
      dataLabels: {
        enabled: false
      },
      colors: ['#fff'],
      fill: {
        type: 'solid',
        opacity: 1
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      xaxis: {
        categories: dates,
        labels: {
          show: false
        },
        min: minDate,
        max: maxDate
      },
      yaxis: {
        min: minValue,
        max: maxValue,
        labels: {
          show: false
        }
      },
      tooltip: {
        theme: 'dark',
        fixed: {
          enabled: false
        },
        x: {
          format: 'yyyy-MM-dd'
        },
        y: {
          formatter: function (val) {
            return val + ` ${unit}`;
          },
          title: {
            formatter: function () {
              return '';
            }
          }
        },
        marker: {
          show: false
        }
      }
    }
  };
}
