// Text of the normal (non-3D) pages: /for-brands, /privacy, /terms.
// One source for both the page you see (src/InfoPage.jsx) and the crawlable HTML built by scripts/prerender.mjs.
//
// Block types: hero, cards, steps, text (paragraphs + list), faq, contact.
// The privacy policy and terms are plain-language drafts written from what this site actually does today.
// Have a lawyer or CA review them before you rely on them, and update them when the site changes
// (for example when you add analytics, forms or accounts).

import { CTA } from '../brands.js'

export const UPDATED = '2026-11-16'
export const EMAIL = CTA.email
export const WHATSAPP_NUMBER = CTA.whatsapp.number
export const WHATSAPP_BASE = CTA.whatsapp.link.split('?')[0] // https://wa.me/91XXXXXXXXXX

export const INFO_PAGES = {
  '/for-brands': {
    title: 'For brands: a 3D store that Google and AI search can read | IndianShoes',
    description:
      'IndianShoes builds your sneaker brand a 3D store, gives every shoe a page that search engines and AI assistants can read, and reports the clicks it sends to your website.',
    h1: 'A 3D store for your sneakers, built to be found',
    crumb: 'For brands',
    blocks: [
      {
        type: 'hero',
        lead: "IndianShoes is a 3D virtual sneaker store for Indian brands. We build your brand's own bay, give every shoe its own page that Google and AI assistants can read, and report how many shoppers we send to your website.",
        links: [
          { label: 'Message us on WhatsApp', href: 'whatsapp', primary: true },
          { label: 'Email us', href: 'email' },
          { label: 'See a live example', href: '/neemans' },
        ],
      },
      {
        type: 'cards',
        h2: 'What you get',
        items: [
          {
            h3: 'Your own 3D brand store',
            p: 'A logo block and a bay with your shoes on shelves. Visitors walk through the store, tap a shoe and see its price. Shoes can be 3D models or clean photo cut-outs.',
          },
          {
            h3: 'Found on Google and AI search',
            p: 'Every shoe gets its own page with a title, description and structured data, plus a sitemap and an llms.txt file, so search engines and AI assistants can read and cite your range.',
          },
          {
            h3: 'Clicks you can measure',
            p: 'Every Buy button goes to your official website. We record the clicks and send you a monthly report of what shoppers looked at and clicked.',
          },
        ],
      },
      {
        type: 'steps',
        h2: 'How it works',
        items: [
          { h3: 'Talk to us', p: 'Tell us about your brand and what you want from the store.' },
          { h3: 'Agree a pilot', p: 'We agree the length, price and terms in writing before any work starts.' },
          { h3: 'We build and publish', p: 'You send official photos and a product list or feed. We build your store and its pages.' },
          { h3: 'Report and decide', p: 'Each month you get a report. Then you decide whether to continue.' },
        ],
      },
      {
        type: 'text',
        h2: 'What we need from you',
        list: [
          'Written permission to show your brand name, logos and photos',
          'Official product photos',
          'A link to your product list or feed, with prices',
          'A contact person for questions and updates',
        ],
      },
      {
        type: 'text',
        h2: 'What this is not',
        list: [
          "Not a marketplace: we don't sell or ship your shoes. Shoppers buy on your website.",
          'No promised numbers: we report what happens and never guarantee a number of sales or leads.',
          'No hidden paid placements: partners and sponsored placements are labelled.',
          'Brands that have not agreed with us are shown as independent listings and are not affiliated with IndianShoes.',
        ],
      },
      {
        type: 'faq',
        h2: 'Common questions from brands',
        items: [
          { q: 'Do you sell my shoes?', a: 'No. IndianShoes does not sell shoes. Every Buy button sends the shopper to your official website.' },
          {
            q: 'What does it cost?',
            a: 'It depends on how many shoes you have and what you want included. We start with a short call and agree a pilot and a price in writing before any work starts.',
          },
          {
            q: 'How do you measure results?',
            a: 'We record clicks on each shoe\'s Buy button and report them to you every month, together with search visibility data. Clicks are what we can measure; sales happen on your own website.',
          },
          { q: 'Do I need to give permission?', a: "Yes. We only feature a brand's name, logos and photos with its written permission." },
          { q: 'Which brands can join?', a: 'Indian sneaker and footwear brands that have an official website and product photos.' },
          { q: 'How long does it take?', a: "It depends on the size of your range. We give you an estimate when we talk." },
        ],
      },
      { type: 'contact', h2: 'Talk to us' },
    ],
  },

  '/privacy': {
    title: 'Privacy policy | IndianShoes',
    description: 'What IndianShoes collects when you visit theindianshoes.com, why, who else sees it, and how to ask us to delete it.',
    h1: 'Privacy policy',
    crumb: 'Privacy',
    updated: UPDATED,
    blocks: [
      {
        type: 'text',
        h2: 'Who we are',
        paragraphs: [`IndianShoes runs theindianshoes.com, a 3D store that showcases Indian sneaker brands. You can contact us at ${EMAIL}.`],
      },
      {
        type: 'text',
        h2: 'What we collect',
        list: [
          'When you click a Buy button: the brand, the shoe, the page you were on, the date and time, the website you came from, and a random session code that is not linked to your name. We do not store your IP address ourselves.',
          'When you message us on WhatsApp or by email: whatever you choose to send us.',
          'On your own device: your browser may keep a short list of your recent Buy clicks. It stays on your device and is not sent to us.',
        ],
      },
      {
        type: 'text',
        h2: 'What we do not do',
        list: [
          'We do not have accounts or logins.',
          'We do not show ads or sell your data.',
          'We do not currently use analytics or advertising cookies. If that changes, we will update this page first.',
        ],
      },
      {
        type: 'text',
        h2: 'Why we use it',
        paragraphs: [
          'We use click records to tell the brands featured here how many shoppers we sent them and which shoes they looked at, and to keep the site working. We use messages you send us to reply to you.',
        ],
      },
      {
        type: 'text',
        h2: 'Who else sees it',
        list: [
          'Our hosting provider, Vercel, keeps standard server logs, which can include IP addresses.',
          'Google Fonts: the page loads a font from Google, so Google receives your IP address and browser details.',
          'The brand websites you click through to have their own privacy policies. Buy links may be affiliate links; see our Terms.',
          'WhatsApp and your email provider handle the messages you send us.',
        ],
      },
      {
        type: 'text',
        h2: 'How long we keep it',
        paragraphs: ['We keep click records for as long as we need them for brand reports. Messages are kept while we are in touch with you. Tell us if you want something removed.'],
      },
      {
        type: 'text',
        h2: 'Your choices',
        paragraphs: [
          `You can ask us to show you, correct or delete personal data we hold about you under the data-protection law that applies in India. Email ${EMAIL} and we will reply. Because click records use a random code rather than your name, we may not be able to find them unless you can describe them.`,
        ],
      },
      {
        type: 'text',
        h2: 'Children',
        paragraphs: ['This site is not aimed at children.'],
      },
      {
        type: 'text',
        h2: 'Changes',
        paragraphs: [`We will update this page when the site changes. The date at the top shows when it last changed.`],
      },
    ],
  },

  '/terms': {
    title: 'Terms of use | IndianShoes',
    description: 'The rules for using theindianshoes.com: what the site is, prices, affiliate links, brand names and images, and how to ask for a brand to be removed.',
    h1: 'Terms of use',
    crumb: 'Terms',
    updated: UPDATED,
    blocks: [
      {
        type: 'text',
        h2: 'What this site is',
        paragraphs: [
          'IndianShoes is a showcase of Indian sneaker brands. We do not sell, ship or take payment for shoes. When you click Buy you go to the brand\'s own website, and your purchase is between you and that brand.',
        ],
      },
      {
        type: 'text',
        h2: 'Prices and product details',
        paragraphs: [
          'Prices, names and photos come from each brand\'s website as of the last time we updated the store. They change. Always confirm the current price, size availability and delivery terms on the brand\'s website.',
        ],
      },
      {
        type: 'text',
        h2: 'Affiliate links and disclosure',
        paragraphs: [
          'Some links on this site are affiliate links. If you buy through them we may earn a commission, at no extra cost to you. Brands that are partners or that pay for placement are labelled. Brands that are not are shown as independent listings and are not affiliated with IndianShoes.',
        ],
      },
      {
        type: 'text',
        h2: 'Brand names, logos and images',
        paragraphs: [
          'Brand names, logos, product photos and designs belong to their owners. They appear here to show the brands\' products. If you are a brand owner and want something changed or removed, email us at ' +
            EMAIL +
            ' and we will act on it promptly.',
        ],
      },
      {
        type: 'text',
        h2: 'Using the site',
        paragraphs: ['Please use the site normally. Do not try to disrupt it, overload it, or copy it in bulk without asking us.'],
      },
      {
        type: 'text',
        h2: 'Our responsibility',
        paragraphs: [
          'We do our best to keep the site accurate and available, but it is provided as it is. To the extent the law allows, we are not responsible for losses that arise from using the site or from a purchase you make on a brand\'s website.',
        ],
      },
      {
        type: 'text',
        h2: 'Changes and contact',
        paragraphs: [`We may update these terms. The date at the top shows when they last changed. Questions: ${EMAIL}.`],
      },
    ],
  },
}

export const INFO_PATHS = Object.keys(INFO_PAGES)
