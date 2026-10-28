import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests',timeout:60000,grep:/anonymous story|parent gate/,use:{baseURL:'https://nuvokidsbook.pages.dev',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}}});
