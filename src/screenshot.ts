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

  const variables = { address: "global" }
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // get a path-safe date
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1920, height: 1080 }, // set browser size (this is the default for testing)
  });
  // selectors
  const tableSelector =
    "#sales-rankings-24h > div > div.sales-ranking-period__top-sales > div:nth-child(4) > table";
  const sevenDaySelector =
    "#page-wrapper > div.wrapper.wrapper-content.animated.fadeInRight.noUpperPadding > div > ul > li:nth-child(3) > a";
  const thirtyDaySelector =
    "#page-wrapper > div.wrapper.wrapper-content.animated.fadeInRight.noUpperPadding > div > ul > li:nth-child(4) > a";
  const dayTableSelector =
    "#sales-rankings-24h > div > div.sales-ranking-period__top-sales > div:nth-child(4) > table tr";
  const sevenDayTableSelector =
    "#sales-rankings-7d > div > div.sales-ranking-period__top-sales > div:nth-child(4) > table tr";
  const thirtyDayTableSelector =
    "#sales-rankings-30d > div > div.sales-ranking-period__top-sales > div:nth-child(4) > table tr";
  const dailySelector = "#table tr"

  const url = "https://cryptoslam.io"
  const dailyUrl = url + "/immutablex/?month=" + date.substring(0, 7);
  
  const page = await browser.newPage();
  await page.goto(url); // load the url
  const table = await page.$(tableSelector); // get the table
  await table?.screenshot({
    path: "cryptoslam - " + date + ".png",
  });

  // select day 1
  let day = await getTableData(page, dayTableSelector, "24hr");

  // select day 7
  await page.click(sevenDaySelector);
  await delay(2000);
  let sevenDay = await getTableData(page, sevenDayTableSelector, "7 day");

  // select day 30
  await page.click(thirtyDaySelector);
  await delay(2000);
  let thirtyDay = await getTableData(page, thirtyDayTableSelector, "30 day");
  
  await page.goto(dailyUrl); // load the daily summary url
  await delay(10000); // wait 10s as this page is shit
  const daily =  await getDailyTableData(page, dailySelector);
  let dailyTradeVolume = daily[daily.length - 2][2]
  let dailyTradeDate = daily[daily.length - 2][1]
  
  // print your updates
  console.log(day);
  console.log(sevenDay);
  console.log(thirtyDay);
  console.log("Daily trading page: " + dailyTradeVolume + " on " + dailyTradeDate)
  
  const data: any = await gotScraping('https://3vkyshzozjep5ciwsh2fvgdxwy.appsync-api.us-west-2.amazonaws.com/graphql', {
    // we are expecting a JSON response back
    responseType: 'json',
    // we must use a post request
    method: 'POST',
    // this is where we pass in our token
    headers: { 'x-api-key': "da2-ihd6lsinwbdb3e6c6ocfkab2nm", 'Content-Type': 'application/json' },
    // here is our query with our variables
    body: JSON.stringify({ query: GET_LATEST.loc?.source.body, variables }),
});
  let immutascanTradeVolume = data.body["data"]["getMetricsAll"]["items"][2]["trade_volume_usd"];
  let immutascanTradeDate = data.body["data"]["getMetricsAll"]["items"][2]["type"];
  console.log("Immutascan trade volume: " + immutascanTradeVolume + " on: " + immutascanTradeDate)
  await page.close();
  await browser.close();  
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
  let buyers = imx[4];
  let transactions = imx[5];

  return `${period} data: IMX Position: ${rank}, volume: ${volume}, buyers: ${buyers}, transactions: ${transactions}`;
}

async function getDailyTableData(
  page: puppeteer.Page,
  table: string,
) {
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
