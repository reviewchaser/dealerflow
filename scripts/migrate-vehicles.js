/**
 * Vehicle Migration Script
 *
 * Imports 132 vehicles from old DMS export into DealerFlow.
 *
 * Usage:
 *   node scripts/migrate-vehicles.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

// ============================================================================
// CONFIGURATION
// ============================================================================
const DEALER_ID = process.env.DEALER_ID || "6943debd4c6f461b33ea742d";
const API_DELAY_MS = 2000; // 2 seconds between vehicles for rate limiting

// ============================================================================
// VEHICLE DATA FROM PDF (132 vehicles)
// ============================================================================
const vehiclesToImport = [
  // Page 1
  { vrm: "YT09YXX", purchaseDate: "2017-11-06", price: 1000.00, mileage: 77000, vatQ: false, fallbackMake: "VAUXHALL", fallbackModel: "AGILA DESIGN AUTO" },
  { vrm: "WG06OGR", purchaseDate: "2020-02-11", price: 650.00, mileage: 81000, vatQ: false, fallbackMake: "FORD", fallbackModel: "FUSION+" },
  { vrm: "PO66FDF", purchaseDate: "2020-05-26", price: 9500.00, mileage: null, vatQ: true, fallbackMake: "FIAT", fallbackModel: "DUCATO" },
  { vrm: "VN09DZK", purchaseDate: "2020-10-08", price: 700.00, mileage: 110000, vatQ: false, fallbackMake: "FORD", fallbackModel: "FIESTA ZETEC 68 TDCI" },
  { vrm: "RV04LLW", purchaseDate: "2021-01-06", price: 4500.00, mileage: 93000, vatQ: false, fallbackMake: "NISSAN", fallbackModel: "CABSTAR 34.10 SWB" },
  { vrm: "YG08ZUC", purchaseDate: "2021-12-10", price: 6549.00, mileage: 109200, vatQ: false, fallbackMake: "BMW", fallbackModel: "325I M SPORT A" },
  { vrm: "WJ59EXB", purchaseDate: "2022-05-23", price: 2800.00, mileage: 121000, vatQ: false, fallbackMake: "LAND ROVER", fallbackModel: "FREELANDER XS TD4 E" },
  { vrm: "WM08ODU", purchaseDate: "2022-05-26", price: 697.00, mileage: 105000, vatQ: false, fallbackMake: "FORD", fallbackModel: "FIESTA ZETEC BLUE" },
  { vrm: "BG59YPF", purchaseDate: "2023-07-05", price: 850.00, mileage: 166000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "TIGUAN ESCAPE TDI" },
  { vrm: "LB59HFX", purchaseDate: "2023-07-18", price: 700.00, mileage: 160000, vatQ: false, fallbackMake: "MINI", fallbackModel: "COOPER CAMDEN D" },
  { vrm: "WR57RKJ", purchaseDate: "2023-07-21", price: 1700.00, mileage: 112500, vatQ: false, fallbackMake: "HONDA", fallbackModel: "CR-V EX I-CTDI" },
  { vrm: "WG61XJT", purchaseDate: "2023-08-30", price: 1594.00, mileage: 162000, vatQ: false, fallbackMake: "SKODA", fallbackModel: "YETI SE GREENLINE II TDI CR" },
  { vrm: "VE14NMK", purchaseDate: "2023-10-10", price: 5500.00, mileage: 68400, vatQ: false, fallbackMake: "KIA", fallbackModel: "SPORTAGE 3 SAT NAV ISG CRDI" },
  { vrm: "RK60ZMU", purchaseDate: "2023-11-28", price: 1200.00, mileage: 151139, vatQ: false, fallbackMake: "VOLVO", fallbackModel: "XC60 DRIVE R-DESIGN D3" },
  { vrm: "DN10YFP", purchaseDate: "2023-12-21", price: 1000.00, mileage: 88500, vatQ: false, fallbackMake: "VAUXHALL", fallbackModel: "ASTRA SRI" },
  { vrm: "DK69XWO", purchaseDate: "2024-01-24", price: 11400.00, mileage: null, vatQ: true, fallbackMake: "MITSUBISHI", fallbackModel: "L200 TITAN DI-D" },
  { vrm: "BL18GVO", purchaseDate: "2024-02-21", price: 13555.00, mileage: 147000, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "TRANSPORTER T32 H-LN TDIBMT SA" },
  { vrm: "SM18HNH", purchaseDate: "2024-03-12", price: 5000.00, mileage: 129328, vatQ: false, fallbackMake: "CITROEN", fallbackModel: "RELAY 35 L3H2 EPRISE BLUEHDI" },
  { vrm: "EU14NRY", purchaseDate: "2024-05-04", price: 1200.00, mileage: 154000, vatQ: false, fallbackMake: "PEUGEOT", fallbackModel: "PARTNER 750 SE L2 E-HDI" },
  { vrm: "WV10KNX", purchaseDate: "2024-05-07", price: 1000.00, mileage: 48000, vatQ: false, fallbackMake: "FORD", fallbackModel: "FIESTA STUDIO" },
  { vrm: "YG07EEW", purchaseDate: "2024-05-22", price: 400.00, mileage: 72200, vatQ: false, fallbackMake: "SUZUKI", fallbackModel: "SWIFT VVTS GLX" },
  { vrm: "NX62ZGV", purchaseDate: "2024-06-29", price: 800.00, mileage: 100000, vatQ: false, fallbackMake: "SEAT", fallbackModel: "IBIZA SE TSI S-A" },
  { vrm: "FV61WCP", purchaseDate: "2024-07-02", price: 800.00, mileage: 190000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "JETTA S BLUEMOTION TECH-GY TDI" },
  { vrm: "WN61XPG", purchaseDate: "2024-07-10", price: 500.00, mileage: 198000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "PASSAT S BLUEMOTION TECH TDI" },
  { vrm: "AV65DCX", purchaseDate: "2024-07-29", price: 5600.00, mileage: 79338, vatQ: false, fallbackMake: "FORD", fallbackModel: "KUGA TITANIUM TDCI 4X4" },
  { vrm: "CV67EVD", purchaseDate: "2024-08-08", price: 12160.00, mileage: 329178, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 270" },

  // Page 2
  { vrm: "HJ59ZVM", purchaseDate: "2024-08-10", price: 900.00, mileage: 88000, vatQ: false, fallbackMake: "NISSAN", fallbackModel: "QASHQAI N-TEC DCI" },
  { vrm: "ST10UKN", purchaseDate: "2024-08-13", price: 800.00, mileage: 150000, vatQ: false, fallbackMake: "AUDI", fallbackModel: "A3 SPORT TFSI" },
  { vrm: "MW13LVC", purchaseDate: "2024-08-23", price: 1800.00, mileage: 104400, vatQ: false, fallbackMake: "NISSAN", fallbackModel: "QASHQAI 360" },
  { vrm: "WG59VNO", purchaseDate: "2024-09-16", price: 200.00, mileage: 180000, vatQ: false, fallbackMake: "SKODA", fallbackModel: "OCTAVIA SCOUT TDI" },
  { vrm: "KX67USH", purchaseDate: "2024-10-30", price: 12370.00, mileage: 94432, vatQ: false, fallbackMake: "MERCEDES-BENZ", fallbackModel: "GLC 220 D 4MATIC AMG LINE AUTO" },
  { vrm: "SO17PVA", purchaseDate: "2024-10-30", price: 9941.40, mileage: 81601, vatQ: false, fallbackMake: "SEAT", fallbackModel: "ATECA XCELLENCE TDI 4DRIVE S-A" },
  { vrm: "YJ64XLE", purchaseDate: "2024-12-02", price: 6300.00, mileage: 93000, vatQ: false, fallbackMake: "BMW", fallbackModel: "320D M SPORT TOURING AUTO" },
  { vrm: "FH12KZW", purchaseDate: "2024-12-17", price: 819.00, mileage: 135000, vatQ: false, fallbackMake: "VAUXHALL", fallbackModel: "INSIGNIA SRINAV VXL CDTIBT S/S" },
  { vrm: "LR64BWZ", purchaseDate: "2025-01-18", price: 1400.00, mileage: 126000, vatQ: false, fallbackMake: "NISSAN", fallbackModel: "QASHQAI ACENTA PREMIUM DIG-T" },
  { vrm: "AU60UTJ", purchaseDate: "2025-01-20", price: 1800.00, mileage: 129000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "TIGUAN MATCH TDI 4MOT S-A" },
  { vrm: "MJ12FOA", purchaseDate: "2025-01-21", price: 1000.00, mileage: 108000, vatQ: false, fallbackMake: "HONDA", fallbackModel: "CIVIC I-VTEC SE" },
  { vrm: "SH61AVP", purchaseDate: "2025-01-28", price: 700.00, mileage: 128000, vatQ: false, fallbackMake: "FIAT", fallbackModel: "SCUDO COMF 90 M-JET SWB" },
  { vrm: "KV12EBU", purchaseDate: "2025-03-03", price: 1400.00, mileage: 121000, vatQ: false, fallbackMake: "MERCEDES-BENZ", fallbackModel: "C220 ELEGANCE CDI BLUEEFI-CY A" },
  { vrm: "FN68PUK", purchaseDate: "2025-03-05", price: 9000.00, mileage: 95600, vatQ: true, fallbackMake: "VAUXHALL", fallbackModel: "MOVANO L3H1 F3500 CDTI BITURBO" },
  { vrm: "AK61OJN", purchaseDate: "2025-03-16", price: 800.00, mileage: 170000, vatQ: false, fallbackMake: "MERCEDES-BENZ", fallbackModel: "C220 ELEGANCE ED125 CDI B-CY A" },
  { vrm: "BJ19EYP", purchaseDate: "2025-04-07", price: 9536.50, mileage: 64241, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "TRANSPORTER T30 ST-LN TDI BMT" },
  { vrm: "GJ06PSX", purchaseDate: "2025-04-12", price: 4000.00, mileage: 266846, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "TRANSPORTER T28 85 TDI" },
  { vrm: "EO70WHM", purchaseDate: "2025-04-25", price: 10769.83, mileage: 33121, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CONNECT 220 BSE TDCI A" },
  { vrm: "DS61OSJ", purchaseDate: "2025-05-10", price: 2100.00, mileage: 140000, vatQ: false, fallbackMake: "BMW", fallbackModel: "520D M SPORT AUTO" },
  { vrm: "GH19BOJ", purchaseDate: "2025-05-21", price: 7512.31, mileage: 93195, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "PASSAT GT TSI EVO" },
  { vrm: "WU16FYM", purchaseDate: "2025-05-21", price: 8863.80, mileage: 23293, vatQ: false, fallbackMake: "NISSAN", fallbackModel: "QASHQAI N-TEC DIG-T CVT" },
  { vrm: "SH66SBY", purchaseDate: "2025-05-21", price: 6689.80, mileage: 53799, vatQ: false, fallbackMake: "NISSAN", fallbackModel: "X-TRAIL ACENTA DCI" },
  { vrm: "FY61EYO", purchaseDate: "2025-05-31", price: 1000.00, mileage: 112000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "POLO S 60" },
  { vrm: "CE65TYA", purchaseDate: "2025-05-31", price: 3000.00, mileage: 78570, vatQ: false, fallbackMake: "MINI", fallbackModel: "ONE" },
  { vrm: "SH61LWL", purchaseDate: "2025-06-26", price: 400.00, mileage: 138000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "POLO MATCH 60" },
  { vrm: "CP67ARF", purchaseDate: "2025-06-30", price: 9500.00, mileage: 56993, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "GOLF SE NAVIGATION TSI EVO S-A" },
  { vrm: "DY70PHN", purchaseDate: "2025-06-30", price: 7089.83, mileage: 108756, vatQ: true, fallbackMake: "VAUXHALL", fallbackModel: "COMBO 2300 SPORTIVE TD S/S" },
  { vrm: "SB66WAO", purchaseDate: "2025-06-24", price: 7292.80, mileage: 26208, vatQ: false, fallbackMake: "VAUXHALL", fallbackModel: "INSIG SRI NAV VX CDTI EFLEX SS" },
  { vrm: "WU62PLX", purchaseDate: "2025-05-28", price: 3650.00, mileage: 97150, vatQ: false, fallbackMake: "LAND ROVER", fallbackModel: "FREELANDER XS TD4" },
  { vrm: "CP67UWO", purchaseDate: "2025-07-28", price: 15621.50, mileage: 1, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "TRANSPORTER T32 TDI BMT S-A" },

  // Page 3
  { vrm: "MK10XSF", purchaseDate: "2025-08-12", price: 500.00, mileage: 133000, vatQ: false, fallbackMake: "CITROEN", fallbackModel: "DISPATCH 1000 HDI 90 SWB" },
  { vrm: "S111KEC", purchaseDate: "2025-08-30", price: 6500.00, mileage: 130000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "CADDY C20 HIGHLINE TDI" },
  { vrm: "MW69WSV", purchaseDate: "2025-09-02", price: 6327.33, mileage: 94544, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320 TREND EBLUE" },
  { vrm: "X5GTA", purchaseDate: "2025-09-03", price: 49500.00, mileage: 11500, vatQ: false, fallbackMake: "PORSCHE", fallbackModel: "TAYCAN 4S 79KWH" },
  { vrm: "WJ12JFN", purchaseDate: "2025-09-05", price: 850.00, mileage: 91025, vatQ: false, fallbackMake: "KIA", fallbackModel: "RIO 2" },
  { vrm: "SK69RKX", purchaseDate: "2025-09-10", price: 10863.80, mileage: 60259, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 280LIMITD EBLUE" },
  { vrm: "LO09WCP", purchaseDate: "2025-09-20", price: 200.00, mileage: 116000, vatQ: false, fallbackMake: "KIA", fallbackModel: "SORENTO XE" },
  { vrm: "MJ20VGT", purchaseDate: "2025-09-25", price: 6327.33, mileage: 149876, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300LIMITD EBLUE" },
  { vrm: "LB70EZO", purchaseDate: "2025-09-25", price: 7442.33, mileage: 92467, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 340LEADER EBLUE" },
  { vrm: "YS70CFJ", purchaseDate: "2025-09-25", price: 6737.33, mileage: 122322, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 340 TREND EBLUE" },
  { vrm: "WR70VFB", purchaseDate: "2025-09-29", price: 9054.00, mileage: 96294, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300LIMITD EBLUE" },
  { vrm: "NU15NRZ", purchaseDate: "2025-09-29", price: 2100.00, mileage: 116000, vatQ: false, fallbackMake: "FORD", fallbackModel: "FOCUS TITANIUM TDCI" },
  { vrm: "FH55WFN", purchaseDate: "2025-09-30", price: 100.00, mileage: 163000, vatQ: false, fallbackMake: "FORD", fallbackModel: "FIESTA STYLE" },
  { vrm: "LL63EWZ", purchaseDate: "2025-10-02", price: 6250.00, mileage: 141000, vatQ: false, fallbackMake: "MERCEDES", fallbackModel: "VIANO AMBIENTE 2.2 CDI BLUE-CY" },
  { vrm: "CJ17YAD", purchaseDate: "2025-10-04", price: 6800.00, mileage: 105266, vatQ: false, fallbackMake: "MAZDA", fallbackModel: "MX-5 RF SPORT NAV" },
  { vrm: "YS19LGF", purchaseDate: "2025-10-08", price: 8548.17, mileage: 99336, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320 BASE" },
  { vrm: "VO72TDZ", purchaseDate: "2025-10-08", price: 10869.83, mileage: 57317, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 280 TREND EBLUE" },
  { vrm: "YT20YYR", purchaseDate: "2025-10-14", price: 11494.80, mileage: 52715, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300LIMITD EBLUE" },
  { vrm: "YR68SVV", purchaseDate: "2025-10-14", price: 7239.83, mileage: 107799, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320 BASE" },
  { vrm: "RF67HLV", purchaseDate: "2025-10-14", price: 8548.17, mileage: 106159, vatQ: true, fallbackMake: "FORD", fallbackModel: "RANGER LIMITED 4X4 DCB TDCI A" },
  { vrm: "CJ71LDF", purchaseDate: "2025-10-22", price: 10357.80, mileage: null, vatQ: false, fallbackMake: "CITROEN", fallbackModel: "DISPATCH 1200 ENT PRO B-HDI SS" },
  { vrm: "YF21JWV", purchaseDate: "2025-10-22", price: 9964.83, mileage: 84874, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300LIMITD EBLUE" },
  { vrm: "GL08UXX", purchaseDate: "2025-10-25", price: 3000.00, mileage: 267000, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "CARAVELLE SE TDI 130" },
  { vrm: "CT19KJF", purchaseDate: "2025-10-27", price: 1.00, mileage: 105748, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT 350" },
  { vrm: "HF18UAD", purchaseDate: "2025-10-30", price: 8300.00, mileage: 97000, vatQ: false, fallbackMake: "PEUGEOT", fallbackModel: "5008 ALLURE S/S" },
  { vrm: "LG72RJZ", purchaseDate: "2025-11-03", price: 10569.83, mileage: 56923, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 340LEADER EBLUE" },
  { vrm: "BX71GZO", purchaseDate: "2025-11-03", price: 7100.00, mileage: 114452, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 280LIMITD EBLUE" },
  { vrm: "CN18SDY", purchaseDate: "2025-11-03", price: 1.00, mileage: 1, vatQ: false, fallbackMake: "CITROEN", fallbackModel: "DISPATCH 1000 EN-PRISE BHDI SS" },
  { vrm: "YP69OHK", purchaseDate: "2025-10-15", price: 11074.00, mileage: 49673, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300LIMITD EBLUE" },
  { vrm: "HN71BHF", purchaseDate: "2025-11-03", price: 0.83, mileage: 55000, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320LIMITD EBLUE" },

  // Page 4
  { vrm: "BK65ZSF", purchaseDate: "2025-11-03", price: 3400.00, mileage: 98295, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 330 ECO-TECH" },
  { vrm: "DP70VFR", purchaseDate: "2025-10-30", price: 10974.00, mileage: 136254, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "TRANSPORTER T30 STARTLINE TDI" },
  { vrm: "PJ71KZL", purchaseDate: "2025-10-30", price: 9154.00, mileage: 68275, vatQ: true, fallbackMake: "VAUXHALL", fallbackModel: "VIVARO 3100 SPORTIVE S/S" },
  { vrm: "LK68NXW", purchaseDate: "2025-10-28", price: 8244.83, mileage: 58954, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300 TREND" },
  { vrm: "WN17OBS", purchaseDate: "2025-10-24", price: 13920.00, mileage: 125886, vatQ: true, fallbackMake: "MERCEDES", fallbackModel: "VITO 116 SPORT BLUETEC" },
  { vrm: "CV22WGG", purchaseDate: "2025-11-17", price: 7039.83, mileage: 113799, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CONNECT 240 LTD EBLU A" },
  { vrm: "GD69YOH", purchaseDate: "2025-11-17", price: 11274.00, mileage: 109481, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 290 SPORT EBLUE" },
  { vrm: "FD11GMG", purchaseDate: "2025-11-24", price: 700.00, mileage: 82487, vatQ: false, fallbackMake: "SEAT", fallbackModel: "IBIZA SE COPA" },
  { vrm: "BN70RMZ", purchaseDate: "2025-11-25", price: 11979.00, mileage: 54040, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300LIMITD EBLUE" },
  { vrm: "FE69KJX", purchaseDate: "2025-11-25", price: 7200.00, mileage: 78021, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300LEADER EBLUE" },
  { vrm: "GN67SYS", purchaseDate: "2025-11-25", price: 8100.00, mileage: 129087, vatQ: false, fallbackMake: "MERCEDES", fallbackModel: "VITO 114 BLUETEC" },
  { vrm: "NA63JWM", purchaseDate: "2025-12-02", price: 1100.00, mileage: 131000, vatQ: false, fallbackMake: "RENAULT", fallbackModel: "TRAFIC SL27 DCI" },
  { vrm: "BF15MWA", purchaseDate: "2025-12-02", price: 2000.00, mileage: 154000, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 290 ECO-TECH" },
  { vrm: "RF17UFY", purchaseDate: "2025-12-03", price: 2500.00, mileage: 170000, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 340 TREND" },
  { vrm: "YE70YTJ", purchaseDate: "2025-12-12", price: 8194.83, mileage: 103011, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300 TREND EBLUE" },
  { vrm: "LV64OZP", purchaseDate: "2025-12-12", price: 7700.00, mileage: 25442, vatQ: false, fallbackMake: "MAZDA", fallbackModel: "MX-5 I ROADSTER SPORT TECH NAV" },
  { vrm: "SH56HVD", purchaseDate: "2025-12-15", price: 100.00, mileage: 190000, vatQ: false, fallbackMake: "FORD", fallbackModel: "FOCUS C-MAX STYLE" },
  { vrm: "DP70KHK", purchaseDate: "2025-12-15", price: 4400.00, mileage: 98001, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "CADDY C20 STARTLINE TDI" },
  { vrm: "VK21YOA", purchaseDate: "2025-12-15", price: 7416.67, mileage: 90071, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 280LIMITD EBLUE" },
  { vrm: "MJ20HBA", purchaseDate: "2025-12-15", price: 8748.17, mileage: 124847, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320 TREND EBLUE" },
  { vrm: "LY69KZN", purchaseDate: "2025-12-15", price: 6027.33, mileage: 121164, vatQ: true, fallbackMake: "RENAULT", fallbackModel: "TRAFIC LL30 SPORT ENERGY DCI" },
  { vrm: "BG19LKK", purchaseDate: "2025-12-15", price: 7542.33, mileage: 57086, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 280 BASE" },
  { vrm: "WP69TXG", purchaseDate: "2025-12-15", price: 14205.67, mileage: 115153, vatQ: true, fallbackMake: "MERCEDES", fallbackModel: "VITO 119 SPORT CDI AUTO" },
  { vrm: "HT71AHG", purchaseDate: "2025-12-15", price: 9000.00, mileage: 102555, vatQ: true, fallbackMake: "FORD", fallbackModel: "RANGER LIMITED ECOBLUE 4X4" },
  { vrm: "DN20TDX", purchaseDate: "2025-12-16", price: 4850.00, mileage: 93364, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "CADDY C20 STARTLINE TDI" },
  { vrm: "FP71OUH", purchaseDate: "2025-12-16", price: 9711.50, mileage: 61382, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320 TREND EBLUE" },
  { vrm: "YS19KWA", purchaseDate: "2025-12-16", price: 6000.00, mileage: 110663, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300 TREND" },
  { vrm: "FH15EEZ", purchaseDate: "2025-12-17", price: 5974.05, mileage: 108000, vatQ: false, fallbackMake: "MERCEDES", fallbackModel: "C250 AMG LINE BLUETEC AUTO" },
  { vrm: "MF68URY", purchaseDate: "2025-12-18", price: 6637.33, mileage: 79064, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 340 BASE" },
  { vrm: "FH16UHZ", purchaseDate: "2025-12-18", price: 11777.33, mileage: 122374, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "TRANSPORTER T32 H-LN TDI BMT" },

  // Page 5
  { vrm: "WG15LHZ", purchaseDate: "2025-12-19", price: 6500.00, mileage: 115000, vatQ: false, fallbackMake: "BMW", fallbackModel: "730D M SPORT EXCLUSIVE AUTO" },
  { vrm: "BF60DBX", purchaseDate: "2025-12-20", price: 300.00, mileage: 121000, vatQ: false, fallbackMake: "CITROEN", fallbackModel: "BERLINGO FIRST 600 HDI" },
  { vrm: "PF69VSK", purchaseDate: "2025-12-27", price: 12666.67, mileage: 50760, vatQ: true, fallbackMake: "TOYOTA", fallbackModel: "PROACE DESIGN AUTO" },
  { vrm: "NA22ZVH", purchaseDate: "2025-12-12", price: 12482.33, mileage: 99212, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320LIMITD EBLUE" },
  { vrm: "LC22CEK", purchaseDate: "2025-12-16", price: 7944.83, mileage: 56086, vatQ: true, fallbackMake: "CITROEN", fallbackModel: "DISPATCH 1000 ENT PRO B-HDI SS" },
  { vrm: "NA68UKG", purchaseDate: "2026-01-06", price: 12500.00, mileage: 66000, vatQ: false, fallbackMake: "NISSAN", fallbackModel: "NAVARA TEKNA DCI" },
  { vrm: "EK19ZNU", purchaseDate: "2025-12-12", price: 14700.00, mileage: 81667, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 300 LIMITED" },
  { vrm: "LP65ULZ", purchaseDate: "2025-12-16", price: 7200.00, mileage: 67775, vatQ: false, fallbackMake: "MERCEDES", fallbackModel: "A 200 D SPORT AUTO" },
  { vrm: "WG72MWK", purchaseDate: "2025-12-10", price: 10974.00, mileage: 79164, vatQ: true, fallbackMake: "FORD", fallbackModel: "RANGER LIMITED ECOBLUE 4X4 A" },
  { vrm: "MV18MFX", purchaseDate: "2025-12-22", price: 14800.00, mileage: 62408, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 290 LIMITED" },
  { vrm: "BL21ENU", purchaseDate: "2025-12-27", price: 10569.83, mileage: 36901, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 280LEADER EBLUE" },
  { vrm: "CX70YSC", purchaseDate: "2025-12-27", price: 7442.33, mileage: 47875, vatQ: true, fallbackMake: "FIAT", fallbackModel: "TALENTO TECNICO MULTIJET II" },
  { vrm: "MT67GYX", purchaseDate: "2025-12-29", price: 7642.33, mileage: 58875, vatQ: true, fallbackMake: "VOLKSWAGEN", fallbackModel: "CADDY MAXI C20 TDI" },
  { vrm: "YO19LCK", purchaseDate: "2025-12-27", price: 10264.83, mileage: 42987, vatQ: true, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 320 BASE" },
  { vrm: "WT68DJU", purchaseDate: "2026-01-09", price: 10000.00, mileage: 80000, vatQ: false, fallbackMake: "FORD", fallbackModel: "TRANSIT CUSTOM 280 LIMITED" },
  { vrm: "RF21BPK", purchaseDate: "2026-01-12", price: 11000.00, mileage: 37236, vatQ: false, fallbackMake: "VOLKSWAGEN", fallbackModel: "GOLF LIFE TSI" },
];

// Default tasks to create for each vehicle
const DEFAULT_TASKS = ["PDI", "Valet", "Oil Service Check", "Photos", "Advert"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function lookupVRM(vrm) {
  const cleanVrm = vrm.toUpperCase().replace(/\s/g, "");
  let dvlaData = null;
  let motData = null;

  // DVLA API call
  const dvlaApiKey = process.env.DVLA_API_KEY;
  if (dvlaApiKey) {
    try {
      const dvlaRes = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": dvlaApiKey,
        },
        body: JSON.stringify({ registrationNumber: cleanVrm }),
      });
      if (dvlaRes.ok) {
        dvlaData = await dvlaRes.json();
      }
    } catch (e) {
      console.log(`  DVLA lookup failed: ${e.message}`);
    }
  }

  // MOT API call
  const motApiKey = process.env.DVSA_API_KEY;
  const motClientId = process.env.DVSA_CLIENT_ID;
  const motClientSecret = process.env.DVSA_CLIENT_SECRET;
  const motTokenUrl = process.env.DVSA_TOKEN_URL || "https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token";

  if (motApiKey && motClientId && motClientSecret) {
    try {
      // Get OAuth token
      const tokenRes = await fetch(motTokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: motClientId,
          client_secret: motClientSecret,
          scope: "https://tapi.dvsa.gov.uk/.default",
        }),
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const motRes = await fetch(`https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanVrm}`, {
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "X-API-Key": motApiKey,
          },
        });
        if (motRes.ok) {
          motData = await motRes.json();
        }
      }
    } catch (e) {
      console.log(`  MOT lookup failed: ${e.message}`);
    }
  }

  return { dvlaData, motData };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function migrateVehicles() {
  console.log("=".repeat(60));
  console.log("Vehicle Migration Script");
  console.log("=".repeat(60));
  console.log(`Total vehicles: ${vehiclesToImport.length}`);
  console.log(`Dealer ID: ${DEALER_ID}`);
  console.log("");

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const vehiclesCol = db.collection("vehicles");
  const tasksCol = db.collection("vehicletasks");
  const dealersCol = db.collection("dealers");

  // Verify dealer exists
  const dealer = await dealersCol.findOne({ _id: new mongoose.Types.ObjectId(DEALER_ID) });
  if (!dealer) {
    console.error(`Dealer not found: ${DEALER_ID}`);
    process.exit(1);
  }
  console.log(`Dealer: ${dealer.companyName || dealer.name}`);
  console.log("");

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < vehiclesToImport.length; i++) {
    const v = vehiclesToImport[i];
    const cleanVrm = v.vrm.toUpperCase().replace(/\s/g, "");

    console.log(`[${i + 1}/${vehiclesToImport.length}] ${cleanVrm}...`);

    // Check if already exists
    const existing = await vehiclesCol.findOne({
      dealerId: new mongoose.Types.ObjectId(DEALER_ID),
      regCurrent: cleanVrm,
    });

    if (existing) {
      console.log(`  SKIP: Already exists`);
      skipCount++;
      continue;
    }

    // Lookup VRM
    const { dvlaData, motData } = await lookupVRM(cleanVrm);

    // Get next stock number
    const nextNumber = dealer.salesSettings?.nextStockNumber || 1;
    const prefix = dealer.salesSettings?.stockNumberPrefix || "";
    const stockNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

    // Build vehicle document
    const vehicleDoc = {
      dealerId: new mongoose.Types.ObjectId(DEALER_ID),
      regCurrent: cleanVrm,
      stockNumber: stockNumber,

      // Make/Model
      make: dvlaData?.make || motData?.make || v.fallbackMake,
      model: motData?.model || dvlaData?.model || v.fallbackModel,

      // Details
      year: dvlaData?.yearOfManufacture || motData?.manufactureYear || null,
      colour: dvlaData?.colour || motData?.primaryColour || null,
      fuelType: dvlaData?.fuelType || motData?.fuelType || null,
      mileageCurrent: v.mileage || null,

      // VAT scheme
      vatScheme: v.vatQ ? "VAT_QUALIFYING" : "MARGIN",

      // Status
      status: "in_stock",
      type: "STOCK",
      saleType: "RETAIL",

      // Purchase info
      purchase: {
        purchaseDate: new Date(v.purchaseDate),
        purchasePriceNet: v.price,
      },

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add MOT data if available
    if (motData?.motTests?.[0]?.expiryDate) {
      vehicleDoc.motExpiryDate = new Date(motData.motTests[0].expiryDate);
    }
    if (motData?.motTests) {
      vehicleDoc.motHistory = motData.motTests;
    }
    if (motData?.firstUsedDate) {
      vehicleDoc.firstRegisteredDate = new Date(motData.firstUsedDate);
    }

    // Add DVLA data if available
    if (dvlaData) {
      vehicleDoc.dvlaDetails = {
        co2Emissions: dvlaData.co2Emissions,
        engineCapacity: dvlaData.engineCapacity,
        taxStatus: dvlaData.taxStatus,
        taxDueDate: dvlaData.taxDueDate,
        motStatus: dvlaData.motStatus,
        euroStatus: dvlaData.euroStatus,
      };
      vehicleDoc.lastDvlaFetchAt = new Date();
    }

    try {
      // Insert vehicle
      const result = await vehiclesCol.insertOne(vehicleDoc);
      const vehicleId = result.insertedId;

      // Increment stock number
      await dealersCol.updateOne(
        { _id: new mongoose.Types.ObjectId(DEALER_ID) },
        { $inc: { "salesSettings.nextStockNumber": 1 } }
      );
      dealer.salesSettings.nextStockNumber = nextNumber + 1;

      // Create default tasks
      for (const taskName of DEFAULT_TASKS) {
        await tasksCol.insertOne({
          vehicleId: vehicleId,
          name: taskName,
          status: "pending",
          source: "system_default",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log(`  OK: ${vehicleDoc.make} ${vehicleDoc.model} (${stockNumber})`);
      successCount++;
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      errors.push({ vrm: cleanVrm, error: e.message });
      errorCount++;
    }

    // Rate limiting
    if (i < vehiclesToImport.length - 1) {
      await sleep(API_DELAY_MS);
    }
  }

  // Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("Migration Complete");
  console.log("=".repeat(60));
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log("");
    console.log("Errors:");
    errors.forEach(e => console.log(`  ${e.vrm}: ${e.error}`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

migrateVehicles().catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});
