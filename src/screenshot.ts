import * as puppeteer from "puppeteer";
import { gql } from 'graphql-tag';
import { gotScraping } from 'got-scraping';


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
  });
  const formatterLargeNumber = new Intl.NumberFormat('en-US')
  const formatterPercentage = new Intl.NumberFormat('en-US', {
    style:'percent', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const variables = { address: "global" }
  const now = new Date();

  const date = now.toISOString().split("T")[0]; // get a path-safe date
  var lastmonthdate = new Date();
  //console.log('Last month 1-' + lastmonthdate)
  lastmonthdate.setDate(1);
  //console.log('Last month 2-' + lastmonthdate)
  //lastmonthdate.setMonth(lastmonthdate.getMonth()-1);
  //console.log('Last month 3-' + lastmonthdate)
  let lastmonthdatestring = lastmonthdate.toISOString().split("T")[0];
  console.log('Lastmonth Date ' + lastmonthdatestring)
  console.log('Date ' + date)
  if (date.substring(0, 7) == lastmonthdatestring.substring(0, 7)) {
    console.log('Dates are the same ' + lastmonthdate)
    lastmonthdate.setMonth(lastmonthdate.getMonth()-1);
    console.log('Change month ' + lastmonthdate)
    lastmonthdatestring = lastmonthdate.toISOString().split("T")[0];
  }
  //console.log('Last month 4-' + lastmonthdate.toISOString())
  //console.log('Last month 5-' + lastmonthdatestring)
  //const datetime = now.toISOString()
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1920, height: 1080 }, // set browser size (this is the default for testing)
    //headless:false,
    //slowMo: 200
  });

  const screenshotPath = "img/cryptoslam - "+ date + ".png";
  // selectors
  const tableSelector =
    ".css-18bewgf > div:nth-child(1)";
   const sevenDaySelector =
    "div.css-nybhst:nth-child(2) > p:nth-child(1)";
  const thirtyDaySelector =
    "div.css-nybhst:nth-child(3) > p:nth-child(1)";
  const dayTableSelector =
    ".css-18bewgf > div:nth-child(1)";
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
 // console.log('Last month 6-' + lastmonthdatestring.substring(0, 7))
  const lastMonthDailyUrl = url + "/blockchains/immutablex?month=" + lastmonthdatestring.substring(0, 7);
  
  //console.log('Last month 7-' + lastMonthDailyUrl)

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
  await page.goto(thisMonthDailyUrl); // load the daily summary url
  console.log("Getting daily summary data (this takes 5s)...")
  await delay(5000); // wait 10s as this page is shit
  let daily =  await getDailyTableData(page, dailySelector)
  //console.log ('Number of rows - ' + daily.length)
  //console.table(daily)
  daily = daily.filter((item) => item[0]);
  //daily = daily.filter((item) => {
  //  return item[0] !=null && item[0] !='';
  //})
  console.table(daily)
  if (daily.length < 30) {
    console.log("Getting daily summary data from last month since we don't have enough data (this takes 5s)...")
    console.log('Opening page: ' + lastMonthDailyUrl)
    await page.goto(lastMonthDailyUrl); // load the daily summary url
    await delay(5000); // wait 10s as this page is shit
    daily = daily.concat(await getDailyTableData(page, dailySelector)).filter((item) => item[0]);
    daily = daily.filter((item) => item[0])
    //console.table(daily)
  } 

  //last 24 hours data
  let c_dailyTradeBuyers = daily[0][2];
  let c_dailyTradeTransactions = daily[0][4];
  let c_dailyTradeVolume = daily[0][1];
  let c_dailyTradeDate = daily[0][0];
  

  /*
  //7 day data from daily data
  const sevendaydaily = daily.slice(0,7)
  console.table(sevendaydaily)

  let c_sevendayTradeVolume = daily.slice(0,7).reduce((previous, current)=> previous+Number(current[1].replace(/[^0-9.-]+/g, '')),0);
  console.log ('Cryptoslam - 7 Day data: Trade volume - ' + formatterCurrency.format(c_sevendayTradeVolume))
  let c_sevendayTradeTrades = daily.slice(0,7).reduce((previous, current)=> previous+Number(current[4].replace(/[^0-9.-]+/g, '')),0);
  console.log ('Cryptoslam - 7 Day data: Number of trades - ' + formatterLargeNumber.format(c_sevendayTradeTrades))
  */
  //7 day data from table

  const page7day = await browser.newPage();
  console.log('Opening page: ' + url)
  await page7day.goto(url);
  console.log("Waiting for 1 second...")
  await delay(1000);

  await page7day.click(sevenDaySelector);
  const dataSevenDay = await  page7day.$$eval(sevenDayTableSelector, (rows) => {
    return Array.from(rows, (row) => {
      const columns = row.querySelectorAll("a");
      return Array.from(columns, (column) => column.innerText.trim());
    });
  });
  const outputdataSevenDay = dataSevenDay[0].map((_, colIndex) => dataSevenDay.map(row => row[colIndex]));
  //console.table(outputdataSevenDay)

  let sevenDayTradingData: { chain: string, tradevol: string}[] = 
    [
      {"chain": outputdataSevenDay[1].toString(), "tradevol": outputdataSevenDay[21].toString()},
      {"chain": outputdataSevenDay[2].toString(), "tradevol": outputdataSevenDay[22].toString()},
      {"chain": outputdataSevenDay[3].toString(), "tradevol": outputdataSevenDay[23].toString()},
      {"chain": outputdataSevenDay[4].toString(), "tradevol": outputdataSevenDay[24].toString()},
      {"chain": outputdataSevenDay[5].toString(), "tradevol": outputdataSevenDay[25].toString()},
      {"chain": outputdataSevenDay[6].toString(), "tradevol": outputdataSevenDay[26].toString()},
      {"chain": outputdataSevenDay[7].toString(), "tradevol": outputdataSevenDay[27].toString()},
      {"chain": outputdataSevenDay[8].toString(), "tradevol": outputdataSevenDay[28].toString()},
      {"chain": outputdataSevenDay[9].toString(), "tradevol": outputdataSevenDay[29].toString()},
      {"chain": outputdataSevenDay[10].toString(), "tradevol": outputdataSevenDay[30].toString()},
      {"chain": outputdataSevenDay[11].toString(), "tradevol": outputdataSevenDay[31].toString()},
      {"chain": outputdataSevenDay[12].toString(), "tradevol": outputdataSevenDay[32].toString()},
      {"chain": outputdataSevenDay[13].toString(), "tradevol": outputdataSevenDay[33].toString()},
      {"chain": outputdataSevenDay[14].toString(), "tradevol": outputdataSevenDay[34].toString()},
      {"chain": outputdataSevenDay[15].toString(), "tradevol": outputdataSevenDay[35].toString()},
      {"chain": outputdataSevenDay[16].toString(), "tradevol": outputdataSevenDay[36].toString()},
      {"chain": outputdataSevenDay[17].toString(), "tradevol": outputdataSevenDay[37].toString()},
      {"chain": outputdataSevenDay[18].toString(), "tradevol": outputdataSevenDay[38].toString()},
      {"chain": outputdataSevenDay[19].toString(), "tradevol": outputdataSevenDay[39].toString()},
      {"chain": outputdataSevenDay[20].toString(), "tradevol": outputdataSevenDay[40].toString()}
    ]
  console.table(sevenDayTradingData)

  let c_sevendayTradeVolume = sevenDayTradingData.filter(chain=> chain.chain ==="ImmutableX")
  console.table(c_sevendayTradeVolume)
  console.log ('Cryptoslam - 7 Day data: Trade volume - ' + c_sevendayTradeVolume)

  /*
  //30 day data from daily data
  const tempthirtydaydaily = daily.slice(0,30)
  console.table(tempthirtydaydaily)

  let c_thirtydayTradeVolume = daily.slice(0,30).map(daydata=> Number(daydata[1].replace(/[^0-9.-]+/g, ''))).reduce((previous, current)=> previous+current,0);
  console.log ('Cryptoslam - 30 Day data: Trade volume - ' + formatterCurrency.format(c_thirtydayTradeVolume))
  let c_thirtydayTradeTrades = daily.slice(0,30).map(daydata=> Number(daydata[4].replace(/[^0-9.-]+/g, ''))).reduce((previous, current)=> previous+current,0);
  console.log ('Cryptoslam - 30 Day data: Number of trades - ' + formatterLargeNumber.format(c_thirtydayTradeTrades))
  */

  //30 day data from table
  await page7day.click(thirtyDaySelector);
  await delay(5000);
  const dataThirtyDay = await page7day.$$eval(thirtyDayTableSelector, (rows) => {
    return Array.from(rows, (row) => {
      const columns = row.querySelectorAll("a");
      return Array.from(columns, (column) => column.innerText.trim());
    });
  });
  //console.table(dataThirtyDay)
  const outputdataThirtyday = dataSevenDay[0].map((_, colIndex) => dataThirtyDay.map(row => row[colIndex]));

  let thirtyDayTradingData: { chain: string, tradevol: string}[] = 
    [
      {"chain": outputdataThirtyday[1].toString(), "tradevol": outputdataThirtyday[21].toString()},
      {"chain": outputdataThirtyday[2].toString(), "tradevol": outputdataThirtyday[22].toString()},
      {"chain": outputdataThirtyday[3].toString(), "tradevol": outputdataThirtyday[23].toString()},
      {"chain": outputdataThirtyday[4].toString(), "tradevol": outputdataThirtyday[24].toString()},
      {"chain": outputdataThirtyday[5].toString(), "tradevol": outputdataThirtyday[25].toString()},
      {"chain": outputdataThirtyday[6].toString(), "tradevol": outputdataThirtyday[26].toString()},
      {"chain": outputdataThirtyday[7].toString(), "tradevol": outputdataThirtyday[27].toString()},
      {"chain": outputdataThirtyday[8].toString(), "tradevol": outputdataThirtyday[28].toString()},
      {"chain": outputdataThirtyday[9].toString(), "tradevol": outputdataThirtyday[29].toString()},
      {"chain": outputdataThirtyday[10].toString(), "tradevol": outputdataThirtyday[30].toString()},
      {"chain": outputdataThirtyday[11].toString(), "tradevol": outputdataThirtyday[31].toString()},
      {"chain": outputdataThirtyday[12].toString(), "tradevol": outputdataThirtyday[32].toString()},
      {"chain": outputdataThirtyday[13].toString(), "tradevol": outputdataThirtyday[33].toString()},
      {"chain": outputdataThirtyday[14].toString(), "tradevol": outputdataThirtyday[34].toString()},
      {"chain": outputdataThirtyday[15].toString(), "tradevol": outputdataThirtyday[35].toString()},
      {"chain": outputdataThirtyday[16].toString(), "tradevol": outputdataThirtyday[36].toString()},
      {"chain": outputdataThirtyday[17].toString(), "tradevol": outputdataThirtyday[37].toString()},
      {"chain": outputdataThirtyday[18].toString(), "tradevol": outputdataThirtyday[38].toString()},
      {"chain": outputdataThirtyday[19].toString(), "tradevol": outputdataThirtyday[39].toString()},
      {"chain": outputdataThirtyday[20].toString(), "tradevol": outputdataThirtyday[40].toString()}
    ]
  console.table(thirtyDayTradingData)
  
  let c_thirtydayTradeVolume = thirtyDayTradingData.filter(chain=> chain.chain ==="ImmutableX")
  console.table(c_thirtydayTradeVolume)
  console.log ('Cryptoslam - 30 Day data: Trade volume - ' + c_thirtydayTradeVolume)

  // print your updates
  console.log("Cryptoslam - Daily trading data: " + c_dailyTradeVolume 
  + " with " + c_dailyTradeBuyers 
  + " buyers across "  + c_dailyTradeTransactions
  + " trades on " + c_dailyTradeDate);
  
  console.log("")
  console.log("Cryptoslam data retrieved")
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
    console.log('immutascan data' + data)
    // get the item at index[1] so its the second latest (i.e. yesterday)
    let immutascanTradeVolume = data.body["data"]["getMetricsAll"]["items"][2]["trade_volume_usd"];
    let immutascanTradeDate = data.body["data"]["getMetricsAll"]["items"][2]["type"];
    console.log("Immutascan trade volume: " + formatterCurrency.format(immutascanTradeVolume) + " on: " + immutascanTradeDate)

    //let temp7day = data.body["data"]["getMetricsAll"]["items"].slice(2,9)
    //let temp30day = data.body["data"]["getMetricsAll"]["items"].slice(2,32)
    //console.table(temp7day)

    let i_sevendayTradeVolume = data.body["data"]["getMetricsAll"]["items"].slice(2,9).reduce((previous:any, current:any)=> previous+current.trade_volume_usd,0);
    console.log ('Immutascan - 7 Day data: Volume of trades - ' + formatterCurrency.format(i_sevendayTradeVolume))
    let i_sevendayTradeTrades = data.body["data"]["getMetricsAll"]["items"].slice(2,9).reduce((previous:any, current:any)=> previous+current.trade_count,0);
    console.log ('Immutascan - 7 Day data: Number of trades - ' + formatterLargeNumber.format(i_sevendayTradeTrades))

    //console.table(temp30day)
    let i_thirtydayTradeVolume = data.body["data"]["getMetricsAll"]["items"].slice(2,32).reduce((previous:any, current:any)=> previous+current.trade_volume_usd,0);
    console.log ('Immutascan - 30 Day data: Volume of trades - ' + formatterCurrency.format(i_thirtydayTradeVolume))
    let i_thirtydayTradeTrades = data.body["data"]["getMetricsAll"]["items"].slice(2,32).reduce((previous:any, current:any)=> previous+current.trade_count,0);
    console.log ('Immutascan - 30 Day data: Number of trades - ' + formatterLargeNumber.format(i_thirtydayTradeTrades))
  
    await page.close();
    await browser.close();  

    console.log ('Daily summary - ' + date)
  /*
    let pct24hrVolume = formatterPercentage.format((Number(c_dailyTradeVolume.replace(/[^0-9.-]+/g, ''))/immutascanTradeVolume)-1)
    let pct7dayVolume = formatterPercentage.format((Number(c_sevendayTradeVolume.replace(/[^0-9.-]+/g, ''))/i_sevendayTradeVolume)-1)
    let pct30dayVolume = formatterPercentage.format((Number(c_thirtydayTradeVolume.replace(/[^0-9.-]+/g, ''))/i_thirtydayTradeVolume)-1)

    let tradingData: { tracker: string, date: string, tradevol24hr_usd:string, tradevol7day_usd:string, tradevol30day_usd:string}[] = 
    [
      {"tracker": "Cryptoslam", "date":c_dailyTradeDate, "tradevol24hr_usd": c_dailyTradeVolume, "tradevol7day_usd":c_sevendayTradeVolume, "tradevol30day_usd":c_thirtydayTradeVolume},
      {"tracker": "Immutascan", "date":immutascanTradeDate, "tradevol24hr_usd": formatterCurrency.format(immutascanTradeVolume), "tradevol7day_usd":formatterCurrency.format(i_sevendayTradeVolume), "tradevol30day_usd":formatterCurrency.format(i_thirtydayTradeVolume)},
      {"tracker": "Cr/Im", "date":date, "tradevol24hr_usd": pct24hrVolume, "tradevol7day_usd":pct7dayVolume, "tradevol30day_usd":pct30dayVolume}
    ]
    console.table(tradingData);
    */


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
