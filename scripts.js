
let data; // Parsed CSV data
let initialBalance = 1000;

const layout = {
  title: "My Balance",
  height: 600,
  yaxis: {
    rangemode: "tozero"
  }
};

$(document).ready(function(){
  $("#csvFile").change(handleFileSelect);
  $("#plotButton").click(handlePlotButtonClick);
});

// Parse and save the CSV data
function handleFileSelect(event) {

  const file = event.target.files[0];

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    encoding: "ISO-8859-1",
    complete: (results) => {
      data = results;
    }
  });
}

// Manipulate the data and show the plot
function handlePlotButtonClick(event) {

  initialBalance = parseFloat($("#initialBalance").val() || "0");
  console.log("initial balance", initialBalance);
  console.log("parsed data", data);

  if (data) {
    const dataForPlot = balanceDataForPlot(data);
    console.log(dataForPlot);
    Plotly.newPlot("plot", dataForPlot, layout);

  } else {
    window.alert("Select csv file first!");
  }
}

/**
 * Return balance data per day to be used with Plotly
 * @param data CSV data parsed by Papa
 */
function balanceDataForPlot(data) {

  // Strip unnecessary fields
  const stripped = data.data.map((transaction) => {

    const dateKey = data.meta.fields[0]; // "Arvopäivä"
    const deltaKey = data.meta.fields[2]; // "Määrä  EUROA"
    const recipientKey = data.meta.fields[5]; // "Saaja/Maksaja"

    const deltaEur = parseFloat(transaction[deltaKey].replace(",", "."));

    return {
      date: transaction[dateKey],
      delta: deltaEur,
      recipient: transaction[recipientKey]
    };
  });

  // Merge transactions per day
  const mergedForDays = stripped.reduce((data, transaction) => {
    if (data.length === 0) {
      // First one
      data.push({
        ...transaction,
        info: `<b>Transactions:</b> <br>${transaction.delta} €  ${transaction.recipient} <br>`
      });
    } else {
      const last = data[data.length - 1];
      if (last.date === transaction.date) {
        last.delta += transaction.delta;
        last.info += `${transaction.delta} €  ${transaction.recipient} <br>`;
      } else {
        data.push({
          ...transaction,
          info: `<b>Transactions:</b> <br>${transaction.delta} €  ${transaction.recipient} <br>`
        });
      }
    }

    return data;
  }, []);

  // Accumulate balance
  const cumulativeBalance = mergedForDays.reduce((data, day) => {
    if (data.length === 0) {
      data.push({
        date: day.date,
        balance: day.delta,
        info: day.info
      });
    } else {
      const last = data[data.length - 1];
      data.push({
        date: day.date,
        info: day.info,
        balance: last.balance + day.delta
      })
    }

    return data;
  }, []);

  // Add initial balance
  const withInitialBalance = cumulativeBalance.map((day) => {
    return {
      ...day,
      balance: day.balance + initialBalance
    };
  });

  // Map data for Plotly
  const plotData = [
    {
      x: withInitialBalance.map((day) => day.date),
      y: withInitialBalance.map((day) => day.balance),
      text: withInitialBalance.map((day) => day.info),
      type: "scatter"
    }
  ];

  return plotData;
}
