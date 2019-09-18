(function() {

  'use strict';
  
  const tbody = document.querySelector('#data-table > tbody');
  const checkboxes = [...document.querySelectorAll('input[type=checkbox]')];
  const arrows = [...document.querySelectorAll('.arrow')];
  const duration = 15; // minutes
  const ids = ['pwr.v', 'pwr.c'];
  let rows; // recent data

  getHistoricalData();

  function getHistoricalData() {
    const dates = getDates();
    Promise.all(ids.map(id =>
      fetch(`http://localhost:8080/history/${id}?start=${dates.previousDate}&end=${dates.now}`)
        .then(resp => resp.ok ? Promise.resolve(resp)
          : Promise.reject(new Error(resp.statusText)))
        .then(resp => resp.json())
        .catch(err => new Error(`A network error occurred! (${err})`))
    )).then(data => {
      rows = data[0].concat(data[1]).map(addDisplayData);
      updateTable();
      attachEventHandlers();
      startAutoUpdate();
      document.querySelector('#loading').classList.add('hidden');
      document.querySelector('#content').classList.remove('hidden');
    });
  }

  function getDates() {
    const now = new Date();
    return {
      now: now.valueOf(),
      previousDate: now.setMinutes(now.getMinutes() - duration)
    };
  }

  function addDisplayData(row) {
    row.timestampDisplay = new Date(row.timestamp).toISOString();
    return row;
  }

  function updateTable() {
    const dates = getDates();
    rows = rows.filter(row => row.timestamp > dates.previousDate); // remove old data
    const idsToDisplay = checkboxes.filter(el => el.checked).map(el => el.value);
    const rowsToDisplay = rows.slice().filter(row => idsToDisplay.includes(row.id));
    rowsToDisplay.sort(sortByTimestamp);
    tbody.innerHTML = rowsToDisplay.map(row =>
      `<tr>
        <td>${row.id}</td>
        <td>${row.timestampDisplay}</td>
        <td>${row.value}
      </tr>`).join('');
  }

  function startAutoUpdate() {
    const ws = new WebSocket('ws://localhost:8080/realtime');
    ws.onopen = function() {
      ids.forEach(id => ws.send(`subscribe ${id}`));
    };
    ws.onmessage = function (e) { 
      rows.push(addDisplayData(JSON.parse(e.data)));
      updateTable();
    };
  }

  function attachEventHandlers() {
    for (let chk of checkboxes)
      chk.onchange = updateTable;
    const upArrow = document.querySelector('.arrow.up');
    const downArrow = document.querySelector('.arrow.down');
    document.querySelector('#timestamp-header').onclick = e => {
      e.preventDefault();
      if (isAscSort()) {
        upArrow.classList.remove('active');
        downArrow.classList.add('active');
      }
      else {
        downArrow.classList.remove('active');
        upArrow.classList.add('active');
      }
      updateTable();
    };
  }

  function sortByTimestamp(a, b) {
    return isAscSort() ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
  }

  function isAscSort() {
    return arrows.some(el =>
      el.classList.contains('active') && el.classList.contains('up'));
  }

})();

