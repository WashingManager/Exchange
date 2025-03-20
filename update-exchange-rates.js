import fetch from 'node-fetch';
import fs from 'fs';
import cheerio from 'cheerio';

async function updateExchangeRates() {
    try {
        const response = await fetch('https://www.kita.net/cmmrcInfo/ehgtGnrlzInfo/rltmEhgt.do');
        const text = await response.text();
        console.log('응답 상태:', response.status);
        if (!response.ok) throw new Error(`HTTP 오류: ${response.status}`);

        const $ = cheerio.load(text);
        const exchangeData = [];

        $('.table-wrap-outline tbody tr').each((i, row) => {
            const cells = $(row).find('th, td');
            const currencyLink = $(cells[0]).find('a').html();
            let currencyFull = '';
            if (currencyLink) {
                const currencyParts = currencyLink.split(/<br\s*class="d-lg-none"\s*>/i);
                const code = $(`<div>${currencyParts[0]}</div>`).text().trim();
                const country = currencyParts[1] ? $(`<div>${currencyParts[1]}</div>`).text().trim().replace(/class="d-lg-none">/g, '') : '';
                currencyFull = `${code} ${country}`.trim();
            } else {
                currencyFull = $(cells[0]).find('a').text().trim();
            }

            const changeCell = $(cells[2]);
            const changeText = changeCell.text().trim();
            const changeDirection = changeText.includes('▼') ? '하락' : '상승';
            const changeValue = changeText.replace(/[▲▼\n\t\s]+/g, '');

            exchangeData.push({
                currency: currencyFull,
                baseRate: $(cells[1]).text().trim(),
                change: changeValue,
                changeDirection,
                changeRate: $(cells[3]).text().trim(),
                cashBuy: $(cells[4]).text().trim(),
                cashSell: $(cells[5]).text().trim(),
                send: $(cells[6]).text().trim(),
                receive: $(cells[7]).text().trim()
            });
        });

        const exchangeDesc = $('.exchange-desc');
        const date = exchangeDesc.find('div').eq(0).text().trim();
        const round = exchangeDesc.find('div').eq(1).find('strong').text().trim();

        fs.writeFileSync(
            'exchange-rates.json',
            JSON.stringify({ rates: exchangeData, date, round }, null, 2)
        );
        console.log('exchange-rates.json 업데이트 성공');
    } catch (error) {
        console.error('업데이트 실패:', error);
        fs.writeFileSync(
            'exchange-rates.json',
            JSON.stringify({ rates: [{ currency: '오류', baseRate: '데이터 업데이트 실패' }], date: 'N/A', round: 'N/A' }, null, 2)
        );
    }
}

updateExchangeRates();
