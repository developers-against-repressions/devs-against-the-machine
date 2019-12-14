const axios = require('axios')
const cheerio = require('cheerio')
const cp = require('child_process')
const fs = require('fs')
const git = require('simple-git/promise')
const R = require('ramda')
const Telegraf = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)
const channelChatId = process.env.CHANNEL_ID

bot.start((ctx) => ctx.reply('Welcome!'))
bot.launch()


let initialState = []
try {
  initialState = JSON.parse(fs.readFileSync('state.json')).map(x => ({...x, date: new Date(x.date).getTime()}))
} catch (e) {
  initialState = []
}


const parsePage = async () => {
  const response = await axios.get('https://github.com/developers-against-repressions/devs-against-the-machine');
  const $ = cheerio.load(response.data)
  const links = Array.prototype.map.call(
    $('#readme > div.Box-body > article > table > tbody').find('a'),
    x => $(x).attr('href')
  ).map(
    x => x.slice(-1) === '/' ? x.slice(0, -1) : x
  ).filter(x => x.includes('github.com'))
  console.log(links)

  const activeProjects = []

  for (const link of links) {
    const projectName = link.split('/').slice(-1)[0]
    try {
      const isExists = fs.statSync(projectName)
      activeProjects.push({project: projectName, link})
    } catch (e) {
      console.log('clone ', link)
      try {
        const repoRes = await axios.get(link)
        cp.execSync(`git clone ${link}`)
        activeProjects.push({project: projectName, link})
      } catch (e) {
        console.error('no repo', link)
      }
    }
  }

  let totalCommits = []

  for (const {project, link} of activeProjects) {
    let commits = {}
    try {
      await git(project).fetch()
      commits = await git(project).log()
    } catch (e) {

    }
    console.log(`Project: ${project}`)
    if (commits && commits.all) {
      totalCommits = totalCommits.concat(commits.all.map(x => ({
        ...x,
        date: new Date(x.date).getTime(),
        project,
        link
      })))
    }
  }

  const hashMap = R.groupBy(x => x.hash, initialState)

  for (const commit of totalCommits) {
    if (hashMap[commit.hash]) continue;
    const message = await bot.telegram.sendMessage(
      channelChatId,
      `<a href="${commit.link}">${commit.project}</a>: <a href="${commit.link}/commit/${commit.hash}">${commit.hash}</a> ${commit.message}
${commit.body}`,
      {parse_mode: "HTML"}
    );
  }

  fs.writeFileSync('state.json', JSON.stringify(totalCommits))
  console.log('all messages sent')
}


parsePage()

