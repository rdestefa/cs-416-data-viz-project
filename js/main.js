WIDTH = 600;
HEIGHT = 600;

OVERVIEW_DATA = [];
GENRES_DATA = [];
GAMES_DATA = [];

let curScene = 0;
let curGenre = 'Multiplayer Online Battle Arena (MOBA)';
const scenes = [
  {id: 'overview', title: 'Overview', drawViz: drawOverview},
  {id: 'by_genre', title: 'By Genre', drawViz: drawGenres},
  {id: 'by_game', title: 'By Game', drawViz: drawGames},
];

function getAllGamesOfGenre(games, genre) {
  return games.filter((game) => game.genre === genre);
}

function aggregatePlayTimeByProperty(games, property) {
  const playTimeByProp = {};

  games.forEach((game) => {
    if (!playTimeByProp[game[property]]) {
      playTimeByProp[game[property]] = 0;
    }
    playTimeByProp[game[property]] += game.hours;
  });

  return Object.entries(playTimeByProp);
}

function getUniqueProps(games, prop) {
  const props = new Set();
  games.forEach((game) => props.add(game[prop]));
  return Array.from(props).sort((a, b) => a - b);
}

function groupByGenre(games) {
  const groupedGames = [];

  games.forEach((curGame) => {
    const matchingGameIndex = groupedGames.findIndex((game) => {
      return game.year === curGame.year && game.genre === curGame.genre;
    });

    if (matchingGameIndex !== -1) {
      groupedGames[matchingGameIndex] = Object.assign(
        groupedGames[matchingGameIndex],
        {
          hours: groupedGames[matchingGameIndex].hours + curGame.hours,
        }
      );
    } else {
      groupedGames.push(JSON.parse(JSON.stringify(curGame)));
    }
  });

  const years = getUniqueProps(games, 'year');
  const genres = getUniqueProps(games, 'genre');

  years.forEach((year) => {
    genres.forEach((genre) => {
      if (
        groupedGames.findIndex((game) => {
          return game.year === year && game.genre === genre;
        }) === -1
      ) {
        groupedGames.push({
          genre: genre,
          year: year,
          hours: 0,
        });
      }
    });
  });

  return groupedGames.sort((a, b) => a.year - b.year);
}

function groupByGame(games) {
  const groupedGames = [];

  games.forEach((curGame) => {
    const matchingGameIndex = groupedGames.findIndex((game) => {
      return game.year === curGame.year && game.name === curGame.name;
    });

    if (matchingGameIndex !== -1) {
      groupedGames[matchingGameIndex] = Object.assign(
        groupedGames[matchingGameIndex],
        {
          hours: groupedGames[matchingGameIndex].hours + curGame.hours,
        }
      );
    } else {
      groupedGames.push(JSON.parse(JSON.stringify(curGame)));
    }
  });

  const years = getUniqueProps(groupedGames, 'year');
  const uniqueGames = getUniqueProps(groupedGames, 'name');

  years.forEach((year) => {
    uniqueGames.forEach((uniqueGame) => {
      if (
        groupedGames.findIndex((game) => {
          return game.year === year && game.name === uniqueGame;
        }) === -1
      ) {
        groupedGames.push({
          name: uniqueGame,
          year: year,
          hours: 0,
        });
      }
    });
  });

  return groupedGames.sort((a, b) => a.year - b.year);
}

function drawScene(i) {
  const scene = scenes[i];
  d3.selectAll('svg > *').remove();
  scene.drawViz();
}

function drawOverview() {
  d3.select('#selector').style('display', 'none');
  const margin = {
    top: 20,
    right: 20,
    bottom: 70,
    left: 80,
  };
  const height = HEIGHT - margin.left - margin.right;
  const width = WIDTH - margin.top - margin.bottom;

  const x = d3.scaleBand().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  let g = d3
    .select('svg')
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  x.domain(OVERVIEW_DATA.map((year) => year[0]));
  y.domain([0, d3.max(OVERVIEW_DATA, (year) => year[1])]);

  g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y));

  g.append('text')
    .attr('class', 'x-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 30)
    .attr('text-anchor', 'middle')
    .text('Year');

  g.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 10)
    .attr('text-anchor', 'middle')
    .text('Total Hours Played');

  g.selectAll('.bar')
    .data(OVERVIEW_DATA)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (year) => x(year[0]) + 5)
    .attr('width', x.bandwidth() - 10)
    .attr('y', (year) => y(year[1]))
    .attr('height', (year) => height - y(year[1]))
    .attr('fill', (_, i) => d3.schemeCategory10[i % 10]);

  let tooltip = d3.select('#tooltip');
  const format = d3.format(',');
  g.selectAll('.bar')
    .on('mouseover', function (e, d) {
      d3.select(this).attr('opacity', 0.6);
      tooltip.transition().duration(300).style('opacity', 0.9);
      tooltip
        .html(`<b>Year:</b> ${d[0]}<br><b>Hours Played:</b> ${format(d[1])}`)
        .style('left', `${e.pageX - 20}px`)
        .style('top', `${e.pageY - 75}px`);
    })
    .on('mouseout', function (_) {
      d3.select(this).attr('opacity', 1);
      tooltip.transition().duration(300).style('opacity', 0);
    });

  const annotation = [
    {
      x: 450,
      y: 150,
      dy: -20,
      dx: 150,
      color: 'black',
      note: {
        label:
          'The pandemic caused many of us to spend more time at home than usual, which led to a lot of video game playing in 2020.',
        align: 'middle',
        title: 'Heavy Gaming',
        wrap: 250,
        padding: 5,
        fontSize: 14,
        orientation: 'below',
      },
      subject: {
        radius: 10,
        radiusPadding: 5,
      },
      connector: {
        end: 'arrow',
        type: 'line',
        endScale: 2,
      },
    },
  ];

  d3.select('svg').append('g').call(d3.annotation().annotations(annotation));

  d3.select('#description').html(`
    This page contains a high-level overview of my gaming habits. Each bar represents
    an aggregation of the total number of hours I spent gaming that year.
  `);
}

function drawGenres() {
  d3.select('#selector').style('display', 'none');
  const margin = {
    top: 20,
    right: 20,
    bottom: 70,
    left: 80,
  };
  const height = HEIGHT - margin.left - margin.right;
  const width = WIDTH - margin.top - margin.bottom;

  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  let g = d3
    .select('svg')
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const groupedData = d3.group(GENRES_DATA, (d) => d.genre);

  x.domain(d3.extent(GENRES_DATA, (game) => game.year)).ticks(8);
  y.domain([0, d3.max(GENRES_DATA, (game) => game.hours)]);

  g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues([2016, 2017, 2018, 2019, 2020, 2021, 2022])
        .tickFormat((num) => num.toFixed(0))
    );
  g.append('g').call(d3.axisLeft(y));

  const genres = getUniqueProps(GENRES_DATA, 'genre');
  const color = d3.scaleOrdinal().domain(genres).range(d3.schemeCategory10);

  const getId = (str, prefix) => `${prefix}${str.replace(/[\s\(\)]/g, '')}`;

  g.selectAll('.line')
    .data(groupedData)
    .join('path')
    .attr('fill', 'none')
    .attr('id', (d) => getId(d[0], 'line'))
    .attr('stroke', (d) => color(d[0]))
    .attr('stroke-width', 1.5)
    .attr('d', (d) =>
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.hours))(d[1])
    );

  g.append('text')
    .attr('class', 'x-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 30)
    .attr('text-anchor', 'middle')
    .text('Year');

  g.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 10)
    .attr('text-anchor', 'middle')
    .text('Total Hours Played');

  const timeAnnotation = {
    x: 600,
    y: 400,
    dy: -175,
    dx: 0,
    color: 'black',
    note: {
      label:
        "In 2022, I started my first full-time job, moved out to California, and began the masters program, so I didn't have much time for gaming.",
      align: 'middle',
      title: 'Too Little Time',
      wrap: 150,
      padding: 5,
      fontSize: 12,
      orientation: 'below',
    },
    subject: {
      radius: 10,
      radiusPadding: 5,
    },
    connector: {
      end: 'arrow',
      type: 'line',
      endScale: 2,
    },
  };
  const bothAnnotations = [
    {
      x: 150,
      y: 100,
      dy: 75,
      dx: 25,
      color: 'black',
      note: {
        label:
          'In 2016-2017, I played League of Legends very competitively, so I did not make time for many other games.',
        align: 'middle',
        title: 'Competitive Gaming',
        wrap: 125,
        padding: 5,
        fontSize: 12,
        orientation: 'above',
      },
      subject: {
        radius: 10,
        radiusPadding: 5,
      },
      connector: {
        end: 'arrow',
        type: 'line',
        endScale: 2,
      },
    },
    timeAnnotation,
  ];
  const oneAnnotation = [timeAnnotation];

  const toggleLine = (_, d) => {
    let line = d3.select(`#${getId(d, 'line')}`);
    let dot = d3.select(`#${getId(d, 'dot')}`);
    let text = d3.select(`#${getId(d, 'text')}`);
    if (line.attr('display') === 'none') {
      line.attr('display', 'unset');
      dot.attr('opacity', 1);
      text.attr('opacity', 1);

      if (d === 'Multiplayer Online Battle Arena (MOBA)') {
        d3.select('#annotations').remove();
        d3.select('svg')
          .append('g')
          .attr('id', 'annotations')
          .call(d3.annotation().annotations(bothAnnotations));
      }
    } else {
      line.attr('display', 'none');
      dot.attr('opacity', 0.5);
      text.attr('opacity', 0.5);

      if (d === 'Multiplayer Online Battle Arena (MOBA)') {
        d3.select('#annotations').remove();
        d3.select('svg')
          .append('g')
          .attr('id', 'annotations')
          .call(d3.annotation().annotations(oneAnnotation));
      }
    }
  };

  g.selectAll('dots')
    .data(genres)
    .enter()
    .append('circle')
    .attr('id', (d) => getId(d, 'dot'))
    .attr('cx', 5)
    .attr('cy', (_, i) => 550 + i * 25)
    .attr('r', 6)
    .style('fill', (d) => color(d))
    .on('click', toggleLine);

  g.selectAll('labels')
    .data(genres)
    .enter()
    .append('text')
    .attr('id', (d) => getId(d, 'text'))
    .attr('x', 25)
    .attr('y', (_, i) => 550 + i * 25)
    .style('fill', (d) => color(d))
    .text((d) => d)
    .attr('text-anchor', 'left')
    .style('alignment-baseline', 'middle')
    .on('click', toggleLine);

  d3.select('svg')
    .append('g')
    .attr('id', 'annotations')
    .call(d3.annotation().annotations(bothAnnotations));

  d3.select('#description').html(`
    Here we can take a look at my gaming habits broken down by genre. I don't play
    many different genres of video games, but there's enough variety to help identify
    trends in my gaming habits throughout the past few years. <b>You can click on the legend
    labels to hide or reveal lines for specific genres.</b> This way you can easily make
    detailed comparisons of specific trends in genres over time.
  `);
}

function drawGames() {
  d3.select('#selector').style('display', 'block');
  const margin = {
    top: 20,
    right: 20,
    bottom: 70,
    left: 80,
  };
  const height = HEIGHT - margin.left - margin.right;
  const width = WIDTH - margin.top - margin.bottom;

  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  let g = d3
    .select('svg')
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const filteredData = groupByGame(getAllGamesOfGenre(GAMES_DATA, curGenre));
  const groupedData = d3.group(filteredData, (d) => d.name);

  x.domain(d3.extent(filteredData, (game) => game.year)).ticks(8);
  y.domain([0, d3.max(filteredData, (game) => game.hours)]);

  g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues([2016, 2017, 2018, 2019, 2020, 2021, 2022])
        .tickFormat((num) => num.toFixed(0))
    );
  g.append('g').call(d3.axisLeft(y));

  const games = getUniqueProps(filteredData, 'name');
  const color = d3.scaleOrdinal().domain(games).range(d3.schemeCategory10);

  const getId = (str, prefix) => `${prefix}${str.replace(/[\s\(\)\.\:]/g, '')}`;

  g.selectAll('.line')
    .data(groupedData)
    .join('path')
    .attr('fill', 'none')
    .attr('id', (d) => getId(d[0], 'line'))
    .attr('stroke', (d) => color(d[0]))
    .attr('stroke-width', 1.5)
    .attr('d', (d) =>
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.hours))(d[1])
    );

  g.append('text')
    .attr('class', 'x-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 30)
    .attr('text-anchor', 'middle')
    .text('Year');

  g.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 10)
    .attr('text-anchor', 'middle')
    .text('Total Hours Played');

  const toggleLine = (_, d) => {
    let line = d3.select(`#${getId(d, 'line')}`);
    let dot = d3.select(`#${getId(d, 'dot')}`);
    let text = d3.select(`#${getId(d, 'text')}`);
    if (line.attr('display') === 'none') {
      line.attr('display', 'unset');
      dot.attr('opacity', 1);
      text.attr('opacity', 1);
    } else {
      line.attr('display', 'none');
      dot.attr('opacity', 0.5);
      text.attr('opacity', 0.5);
    }
  };

  g.selectAll('dots')
    .data(games)
    .enter()
    .append('circle')
    .attr('id', (d) => getId(d, 'dot'))
    .attr('cx', 5)
    .attr('cy', (_, i) => 550 + i * 25)
    .attr('r', 6)
    .style('fill', (d) => color(d))
    .on('click', toggleLine);

  g.selectAll('labels')
    .data(games)
    .enter()
    .append('text')
    .attr('id', (d) => getId(d, 'text'))
    .attr('x', 25)
    .attr('y', (_, i) => 550 + i * 25)
    .style('fill', (d) => color(d))
    .text((d) => d)
    .attr('text-anchor', 'left')
    .style('alignment-baseline', 'middle')
    .on('click', toggleLine);

  d3.select('#description').html(`
    By using the selector below, you can view my hours spent on gaming for specific
    genres broken down further by the specific game(s) I played. Just like with the
    previous page, <b>you can click on the legend labels to hide or reveal lines
    for specific genres.</b>
  `);
}

async function init() {
  d3.csv(
    'https://rdestefa.github.io/cs-416-data-viz-project/data/games.csv'
  ).then(function (games) {
    const parsedGames = games.map((game) => ({
      name: game.name,
      genre: game.genre,
      hours: +game.hours,
      year: +game.year,
      platform: game.platform,
    }));

    OVERVIEW_DATA = aggregatePlayTimeByProperty(parsedGames, 'year').sort(
      (a, b) => a[0] - b[0]
    );
    GENRES_DATA = groupByGenre(parsedGames);
    GAMES_DATA = parsedGames;

    drawOverview();

    /* ------------- NAVIGATION BUTTONS (START) ------------- */

    d3.select('#prev').on('click', () => {
      if (curScene > 0) {
        curScene -= 1;
        drawScene(curScene);
      }
    });
    d3.select('#overview').on('click', () => {
      if (curScene !== 0) {
        curScene = 0;
        drawScene(curScene);
      }
    });
    d3.select('#other').on('click', () => {
      if (curScene !== 1) {
        curScene = 1;
        drawScene(curScene);
      }
    });
    d3.select('#other2').on('click', () => {
      if (curScene !== 2) {
        curScene = 2;
        drawScene(curScene);
      }
    });
    d3.select('#next').on('click', () => {
      if (curScene < 2) {
        curScene += 1;
        drawScene(curScene);
      }
    });

    /* -------------- NAVIGATION BUTTONS (END) -------------- */

    d3.select('#selector').on('change', (e) => {
      curGenre = e.target.value;
      drawScene(2);
    });
  });
}
