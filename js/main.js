WIDTH = 600;
HEIGHT = 600;

OVERVIEW_DATA = [];

let curScene = 0;
const scenes = [
  {id: 'overview', title: 'Overview', drawViz: drawOverview},
  {id: 'by_genre', title: 'By Genre', drawViz: drawGenres},
];

function getAllGamesOfGenre(games, genre) {
  let gameNames = new Set();

  games.forEach((game) => {
    if (game?.genre === genre) {
      gameNames.add(game.name);
    }
  });

  return Array.from(gameNames);
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

function drawScene(i) {
  const scene = scenes[i];
  d3.selectAll('svg > *').remove();
  scene.drawViz();
}

function drawOverview() {
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
}

function drawGenres() {
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
    .call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y));

  const color = d3
    .scaleOrdinal()
    .domain(getUniqueProps(GENRES_DATA, 'year'))
    .range(d3.schemeCategory10);

  g.selectAll('.line')
    .data(groupedData)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (d) => color(d[0]))
    .attr('stroke-width', 1.5)
    .attr('d', (d) =>
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.hours))(d[1])
    );
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
  });
}
