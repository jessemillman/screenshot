import * as puppeteer from "puppeteer";
import { gql } from 'graphql-tag';
import { gotScraping, MaxRedirectsError } from 'got-scraping';

(async () => {
  
  const GET_LATEST = gql`
  query getMetricsAll($address: String!) {
    getMetricsAll(address: $address) {
      items { 
        type
        trade_volume_usd
        trade_volume_eth
        floor_price_usd
        floor_price_eth
        trade_count
        owner_count
        __typename
      }
    }
  }
  `
  // Create our number formatter.
  const formatterCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: "compact",
    compactDisplay: "short"
  });
  const formatterLargeNumber = new Intl.NumberFormat('en-US')
  const formatterPercentage = new Intl.NumberFormat('en-US', {
    style:'percent', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  function isCurrency(element: any)
  {
    let regex = /(?=.*?\d)^\$?(([1-9]\d{0,2}(,\d{3})*)|\d+)?(\.\d{1,2})?$/;
    return regex.test(element);
  }

  //console.log ('Test ' + isCurrency ("$1,199,692"))
  
  const variables = { address: "global" }
  const now = new Date();

  const date = now.toISOString().split("T")[0]; // get a path-safe date
  var lastmonthdate = new Date();
  lastmonthdate.setDate(1);
  let lastmonthdatestring = lastmonthdate.toISOString().split("T")[0];
  console.log('Lastmonth Date ' + lastmonthdatestring)
  console.log('Date ' + date)
  if (date.substring(0, 7) == lastmonthdatestring.substring(0, 7)) {
    console.log('Dates are the same ' + lastmonthdate)
    lastmonthdate.setMonth(lastmonthdate.getMonth()-1);
    console.log('Change month ' + lastmonthdate)
    lastmonthdatestring = lastmonthdate.toISOString().split("T")[0];
  }
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1920, height: 1080 }, // set browser size (this is the default for testing)
    //Uncomment if you need to visually see what puppeteer is doing
    //headless:false,
    //slowMo: 200
  });

  const screenshotPath = "img/cryptoslam - "+ date + ".png";
  // selectors
  const tableSelector =
    ".css-18bewgf > div:nth-child(1)";
   const sevenDaySelector =
    "div.css-1hkzn7e:nth-child(2) > p:nth-child(1)";
  const thirtyDaySelector =
    "div.css-1hkzn7e:nth-child(3) > p:nth-child(1)";
  const dayTableSelector =
    ".css-18bewgf > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2)";
  const sevenDayTableSelector =
    ".css-18bewgf > div:nth-child(1)";
  const thirtyDayTableSelector =
    ".css-18bewgf > div:nth-child(1)";
  const imx_sevenDayTableSelectorSpecific =
    ".css-18bewgf > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1)";
  const imx_thirtyDayTableSelectorSpecific =
    ".css-18bewgf > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1) > a:nth-child(1)"; 
    const imx_Selector =
    "immutablex";
  const dailySelector = "tr"
  const url = "https://www.cryptoslam.io"
  const thisMonthDailyUrl = url + "/blockchains/immutablex?month=" + date.substring(0, 7);
  const lastMonthDailyUrl = url + "/blockchains/immutablex?month=" + lastmonthdatestring.substring(0, 7);
  
  console.log("Opening cryptoslam...")
  const page = await browser.newPage();
  console.log('Opening page: ' + url)
  await page.goto(url);
  console.log("Waiting for 1 second...")
  await delay(1000);

  //trying to force the lazy load to initiate before the pop up
  //console.log("Scroll down a bit to load any lazy loading images...")
  //await page.evaluate('window.scrollBy(0, 200)');

  /* trying to wait for a certain load event
  console.log("Waiting for dom to be loaded...")
  await page.waitForNavigation({
    waitUntil: 'load',
  });
  */
  
  console.log("Get specific protocol ranking table on the page...")
  const table = await page.$(tableSelector); // get the table

  console.log("Take screenshot...")
  await table?.screenshot({
    path: screenshotPath,
  });
  console.log("Screenshot saved to: ./" + screenshotPath);

  console.log("Getting Cryptoslam data...")

  console.log('Opening page: ' + thisMonthDailyUrl)
  let daily
  try {
    await page.goto(thisMonthDailyUrl); // load the daily summary url
    console.log("Getting daily summary data (this takes 5s)...")
    await delay(5000); // wait 5s as this page is shit
  
    daily =  await getDailyTableData(page, dailySelector)
    daily = daily.filter((item) => item[0]);
    if (daily.length==0) throw Error

  } catch (e)
  {
    //try again but wait 10s this time
    console.log("Failed to fetch the first time so trying again (this takes 5s)...")
    await delay(10000); // wait 10s as this page is shit
  
    daily =  await getDailyTableData(page, dailySelector)

  }
 
  //remove blank lines
  daily = daily.filter((item) => item[0]);
  //console.table(daily)

  //make sure we have enough data to make 30 day aggregate otherwise go get last month
  if (daily.length < 30) {
    console.log("Getting daily summary data from last month since we don't have enough data (this takes 5s)...")
    console.log('Opening page: ' + lastMonthDailyUrl)
    await page.goto(lastMonthDailyUrl); // load the daily summary url
    console.log("Getting daily summary data (this takes 5s)...")
    await delay(5000); // wait 5s as this page is shit
    daily = daily.concat(await getDailyTableData(page, dailySelector)).filter((item) => item[0]);
    daily = daily.filter((item) => item[0])
    //console.table(daily)
  } 
  console.table(daily)

  if (daily.length<30) {
    console.log("Not enough data for 30 day aggregate. Something has gone wrong loading the page")
    return
  }

  const c_today = new Date(daily[0][0])

  console.log('Opening page: ' + url)
  await page.goto(url);
  console.log("Waiting for 1 second...")
  await delay(1000);

  let datatwentyfourhr = await  page.$$eval(dayTableSelector, (rows) => {
    return Array.from(rows, (row) => {
      const columns = row.querySelectorAll("a");
      return Array.from(columns, (column) => column.innerText.trim());
    });
  });
  datatwentyfourhr = datatwentyfourhr[0].map((_, colIndex) => datatwentyfourhr.map(row => row[colIndex]));
  //console.table(datatwentyfourhr)
  datatwentyfourhr = datatwentyfourhr.filter((item) => item[0]);
  let numofeleements = datatwentyfourhr.findIndex(isCurrency)
  let twentyfourhourranking  = datatwentyfourhr.findIndex((value) => value.toString() === "ImmutableX")+ 1
  console.log ('24Hr ranking - ' + twentyfourhourranking)
  console.log ('First currency value found at ' + numofeleements)
  let twentyfourHourTradingData: { chain: string, tradevol: string}[] = []
  let i: number = 0
  while (i<numofeleements) {
    twentyfourHourTradingData.push({"chain": datatwentyfourhr[i].toString(), "tradevol": datatwentyfourhr[i+numofeleements].toString()})
    i++;
  }
  
  console.table(twentyfourHourTradingData)

  let c_twentyfourhourTradeVolume: number
  try {
    //check if IMX in the top 20 list and use the data there
    let c_imx_twentyfourhour = twentyfourHourTradingData.filter(chain=> chain.chain ==="ImmutableX")[0]
    c_twentyfourhourTradeVolume = Number(c_imx_twentyfourhour.tradevol.replace(/[^0-9.-]+/g, ''))
    console.table(c_twentyfourhourTradeVolume)
  } catch(e)
  {
    //if not in the top 20 list then use the aggregate data from daily data
    console.log ('ImmutableX not in the top 20 for 24 hr data')
    console.log ('Revert to daily data summary')
    //c_dailyTradeBuyers = daily[0][2];
    //c_dailyTradeTransactions = daily[0][4];
    c_today.setDate(now.getDate())
    if (now != c_today) {
      console.log ('Daily data missing today')
      c_twentyfourhourTradeVolume = 0
    } else c_twentyfourhourTradeVolume = Number(daily[0][1].replace(/[^0-9.-]+/g, ''));
    //c_dailyTradeDate = daily[0][0];
  }

  // print the daily data
  console.log("Cryptoslam - Daily trading data: " + formatterCurrency.format(c_twentyfourhourTradeVolume)
  + " trades on " + c_today.toISOString().split("T")[0]);
  
  //7 day data from table

  await page.click(sevenDaySelector);
  let dataSevenDay = await page.$$eval(sevenDayTableSelector, (rows) => {
    return Array.from(rows, (row) => {
      const columns = row.querySelectorAll("a");
      return Array.from(columns, (column) => column.innerText.trim());
    });
  });
  dataSevenDay = dataSevenDay[0].map((_, colIndex) => dataSevenDay.map(row => row[colIndex]));  
  dataSevenDay = dataSevenDay.filter((item) => item[0]);
  //console.table(dataSevenDay)

  numofeleements = dataSevenDay.findIndex(isCurrency)
  let sevendayranking = dataSevenDay.findIndex((value) => value.toString() === "ImmutableX") +1
  console.log ('7 Day ranking - ' + sevendayranking)
  
  console.log ('First currency value found at ' + numofeleements)
  let sevenDayTradingData: { chain: string, tradevol: string}[] = []
  i=0;
  while (i<numofeleements) {
    sevenDayTradingData.push({"chain": dataSevenDay[i].toString(), "tradevol": dataSevenDay[i+numofeleements].toString()})
    i++;
  }
  console.table(sevenDayTradingData)
  let c_sevendayTradeVolume: number
  try {
    //check if IMX in the top 20 list and use the data there
    let c_imx_sevenday = sevenDayTradingData.filter(chain=> chain.chain ==="ImmutableX")[0]
    c_sevendayTradeVolume = Number(c_imx_sevenday.tradevol.replace(/[^0-9.-]+/g, ''))
    console.table(c_imx_sevenday)
  } catch(e)
  {
    //if not in the top 20 list then use the aggregate data from daily data
    console.log ('ImmutableX not in the top 20 for 7 day data')
    console.log ('Revert to daily data summary')
    const sevendaydaily = daily.slice(0,7)
    console.table(sevendaydaily)

    c_sevendayTradeVolume = sevendaydaily.reduce((previous, current)=> previous+Number(current[1].replace(/[^0-9.-]+/g, '')),0);
  }

  console.log ('Cryptoslam - 7 Day data: Trade volume - ' + formatterCurrency.format(c_sevendayTradeVolume))

  //30 day data from table
  await page.click(thirtyDaySelector);
  await delay(5000);
  let dataThirtyDay = await page.$$eval(thirtyDayTableSelector, (rows) => {
    return Array.from(rows, (row) => {
      const columns = row.querySelectorAll("a");
      return Array.from(columns, (column) => column.innerText.trim());
    });
  });
  dataThirtyDay = dataThirtyDay[0].map((_, colIndex) => dataThirtyDay.map(row => row[colIndex]));
  dataThirtyDay = dataThirtyDay.filter((item) => item[0]);
  //console.table(dataThirtyDay)
  let thirtydayranking = dataThirtyDay.findIndex((value) => value.toString() === "ImmutableX") +1
  console.log ('30 Day ranking - ' + thirtydayranking)
  
  numofeleements = dataThirtyDay.findIndex(isCurrency)
  console.log ('First currency value found at ' + numofeleements)
  let thirtyDayTradingData: { chain: string, tradevol: string}[] = []
  i=0;
  while (i<numofeleements) {
    thirtyDayTradingData.push({"chain": dataThirtyDay[i].toString(), "tradevol": dataThirtyDay[i+numofeleements].toString()})
    i++;
  }
  console.table(thirtyDayTradingData)

  let c_thirtydayTradeVolume: number
  try {
    //check if IMX in the top 20 list and use the data there
    let c_imx_thirtyday = thirtyDayTradingData.filter(chain=> chain.chain ==="ImmutableX")[0]
    c_thirtydayTradeVolume = Number(c_imx_thirtyday.tradevol.replace(/[^0-9.-]+/g, ''))
    console.table(c_imx_thirtyday)
  } catch(e)
  {
    //if not in the top 20 list then use the aggregate data from daily data
    console.log ('ImmutableX not in the top 20 for 30 day data')
    console.log ('Revert to daily data summary')
    const thirtydaydaily = daily.slice(0,30)
    console.table(thirtydaydaily)

    c_thirtydayTradeVolume = thirtydaydaily.reduce((previous, current)=> previous+Number(current[1].replace(/[^0-9.-]+/g, '')),0);
  }

  console.log ('Cryptoslam - 30 Day data: Trade volume - ' + formatterCurrency.format(c_thirtydayTradeVolume))
    
  console.log("")
  console.log("Cryptoslam data retrieved")
  await page.close();
  await browser.close();  
  console.log("")

  console.log("");
  
  console.log("Getting Immutascan data...")
  const data: any = await gotScraping('https://3vkyshzozjep5ciwsh2fvgdxwy.appsync-api.us-west-2.amazonaws.com/graphql', {
    // we are expecting a JSON response back
    responseType: 'json',
    // we must use a post request
    method: 'POST',
    // this is where we pass in our token
    headers: { 'x-api-key': "da2-exzypwa6hng45btg7cwf323cdm", 'Content-Type': 'application/json' },
    // here is our query with our variables
    body: JSON.stringify({ query: GET_LATEST.loc?.source.body, variables }),
  }).catch(function(e) {
    console.log('promise rejected')
  });

  let posfortoday = 1

  // get the item at index[1] so its the second latest (i.e. yesterday)
  let immutascanTradeDate = new Date(data.body["data"]["getMetricsAll"]["items"][posfortoday]["type"]);

  if (now.getUTCHours() < 10) posfortoday +=1

  let i_twentyfourhourTradeVolume = data.body["data"]["getMetricsAll"]["items"][posfortoday]["trade_volume_usd"];
  console.log("Immutascan trade volume: " + formatterCurrency.format(i_twentyfourhourTradeVolume) + " on: " + immutascanTradeDate)

  //let temp7day = data.body["data"]["getMetricsAll"]["items"].slice(2,9)
  //let temp30day = data.body["data"]["getMetricsAll"]["items"].slice(2,32)
  //console.table(temp7day)

  let i_sevendayTradeVolume = data.body["data"]["getMetricsAll"]["items"].slice(posfortoday,posfortoday+7).reduce((previous:any, current:any)=> previous+current.trade_volume_usd,0);
  console.log ('Immutascan - 7 Day data: Volume of trades - ' + formatterCurrency.format(i_sevendayTradeVolume))
  let i_sevendayTradeTrades = data.body["data"]["getMetricsAll"]["items"].slice(posfortoday,posfortoday+7).reduce((previous:any, current:any)=> previous+current.trade_count,0);
  console.log ('Immutascan - 7 Day data: Number of trades - ' + formatterLargeNumber.format(i_sevendayTradeTrades))

  //console.table(temp30day)
  let i_thirtydayTradeVolume = data.body["data"]["getMetricsAll"]["items"].slice(posfortoday,posfortoday+30).reduce((previous:any, current:any)=> previous+current.trade_volume_usd,0);
  console.log ('Immutascan - 30 Day data: Volume of trades - ' + formatterCurrency.format(i_thirtydayTradeVolume))
  let i_thirtydayTradeTrades = data.body["data"]["getMetricsAll"]["items"].slice(posfortoday,posfortoday+30).reduce((previous:any, current:any)=> previous+current.trade_count,0);
  console.log ('Immutascan - 30 Day data: Number of trades - ' + formatterLargeNumber.format(i_thirtydayTradeTrades))

  console.log("Immutascan data retrieved")

  console.log ('Daily summary - ' + date)
  let pct24hrVolume = (c_twentyfourhourTradeVolume/i_twentyfourhourTradeVolume)-1
  let pct7dayVolume = (c_sevendayTradeVolume/i_sevendayTradeVolume)-1
  let pct30dayVolume = (c_thirtydayTradeVolume/i_thirtydayTradeVolume)-1

  //Summary of 
  let tradingData: { tracker: string, date: string, tradevol24hr_usd:string, tradevol7day_usd:string, tradevol30day_usd:string}[] = 
  [
    {"tracker": "Cryptoslam", "date":c_today.toISOString().split("T")[0], "tradevol24hr_usd": formatterCurrency.format(c_twentyfourhourTradeVolume), "tradevol7day_usd":formatterCurrency.format(c_sevendayTradeVolume), "tradevol30day_usd":formatterCurrency.format(c_thirtydayTradeVolume)},
    {"tracker": "Immutascan", "date":immutascanTradeDate.toISOString().split("T")[0], "tradevol24hr_usd": formatterCurrency.format(i_twentyfourhourTradeVolume), "tradevol7day_usd":formatterCurrency.format(i_sevendayTradeVolume), "tradevol30day_usd":formatterCurrency.format(i_thirtydayTradeVolume)},
    {"tracker": "Cr/Im", "date":date, "tradevol24hr_usd": formatterPercentage.format(pct24hrVolume), "tradevol7day_usd":formatterPercentage.format(pct7dayVolume), "tradevol30day_usd":formatterPercentage.format(pct30dayVolume)}
  ]
  console.table(tradingData);

  //Output for slack message
  console.log(`Quick data check (Cryptoslam v Immutascan)`)			
  console.log(`Last 24 hours (Rank ${twentyfourhourranking}) -  ${formatterCurrency.format(c_twentyfourhourTradeVolume)} v  ${formatterCurrency.format(i_twentyfourhourTradeVolume)} (${formatterPercentage.format(pct24hrVolume)}})`)
  console.log(`Last 7 days   (Rank ${sevendayranking}) -  ${formatterCurrency.format(c_sevendayTradeVolume)} v  ${formatterCurrency.format(i_sevendayTradeVolume)} (${formatterPercentage.format(pct7dayVolume)})`)
  console.log(`Last 30 days  (Rank ${thirtydayranking}) - ${formatterCurrency.format(c_thirtydayTradeVolume)} v ${formatterCurrency.format(i_thirtydayTradeVolume)} (${formatterPercentage.format(pct30dayVolume)})`)
  console.log ()
  console.log (`Error rate ` + formatterPercentage.format(Math.max(Math.abs(pct24hrVolume), Math.abs(pct7dayVolume), Math.abs(pct30dayVolume))))

  //Post to Slack
  //upload screenshot first
  //example - curl -F file=@dramacat.gif -F "initial_comment=Shakes the cat" -F channels=C024BE91L,D032AC32T -H "Authorization: Bearer xoxb-xxxxxxxxx-xxxx" https://slack.com/api/files.upload

  //#deal-cryptoslam - https://hooks.slack.com/services/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
  //#ecosytem team - https://hooks.slack.com/services/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
  //Example curl -X POST -H 'Content-type: application/json' --data '{"text":"Hello, World!"}' https://hooks.slack.com/services/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

  console.log("Posting to Slack...")
  const bodybuilding = `{
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Quick data check (Cryptoslam v Immutascan)
• Last 24 hours (Rank ${twentyfourhourranking}) -  ${formatterCurrency.format(c_twentyfourhourTradeVolume)} v  ${formatterCurrency.format(i_twentyfourhourTradeVolume)} (${formatterPercentage.format(pct24hrVolume)}) 
• Last 7 days   (Rank ${sevendayranking}) -  ${formatterCurrency.format(c_sevendayTradeVolume)} v  ${formatterCurrency.format(i_sevendayTradeVolume)} (${formatterPercentage.format(pct7dayVolume)}) 
• Last 30 days  (Rank ${thirtydayranking}) - ${formatterCurrency.format(c_thirtydayTradeVolume)} v ${formatterCurrency.format(i_thirtydayTradeVolume)} (${formatterPercentage.format(pct30dayVolume)}) 
          
Max error rate ${formatterPercentage.format(Math.max(Math.abs(pct24hrVolume), Math.abs(pct7dayVolume), Math.abs(pct30dayVolume)))}"
        }
      }
    ]
  }
  `
  /*
  //insert the below to add an image URL
  ,
      {
        "type": "image",
        "title": {
          "type": "plain_text",
          "text": "Cryptoslam screenshot - ${date}"
        },
        "image_url": "https://assets3.thrillist.com/v1/image/1682388/size/tl-horizontal_main.jpg",
        "alt_text": "Cryptoslam screenshot - ${date}"
      }
  */
  console.log('Export body:' + bodybuilding)
  const slackresponse: any = await gotScraping('https://hooks.slack.com/services/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', {
    // we are expecting a JSON response back
    responseType: 'text',
    // we must use a post request
    method: 'POST',
    // this is where we pass in our token
    headers: { 'Content-Type': 'application/json' },
    // here is our query with our variables
    body: bodybuilding,
  }).catch(function(e) {
    console.log('Error thrown')
    console.log(e.body)
  });
  console.log('Slack message posted - ' + slackresponse.body)

})();

async function getTableData(
  page: puppeteer.Page,
  table: string,
  period: string
) {
  const data = await getDailyTableData(page, table)

  const imx = data.find((element) => element[1] == "ImmutableX") || "";
  let rank = imx[0];
  let volume = imx[2];
  let transactions = imx[3];
  let buyers = imx[4];

  return `${period} data: IMX Position: ${rank}, volume: ${volume}, buyers: ${buyers}, transactions: ${transactions}`;
}

async function getDailyTableData(
  page: puppeteer.Page,
  table: string,
) {
  const wholetable = await page.$(table)
  const data = await page.$$eval(table, (rows) => {
    return Array.from(rows, (row) => {
      const columns = row.querySelectorAll("td");
      return Array.from(columns, (column) => column.innerText.trim());
    });
  });

  return data;
}

function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
