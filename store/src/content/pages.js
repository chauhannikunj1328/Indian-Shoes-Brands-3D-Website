// Text of the normal (non-3D) pages: /for-brands, /privacy, /terms.
// One source for both the page you see (src/InfoPage.jsx) and the crawlable HTML built by scripts/prerender.mjs.
//
// Block types: hero, cards, steps, text (paragraphs + list), faq, contact, plans (pricing cards), table, brands (the brand list).
// The privacy policy and terms are plain-language drafts written from what this site actually does today.
// Have a lawyer or CA review them before you rely on them, and update them when the site changes
// (for example when you add analytics, forms or accounts).

import { CTA, BRANDS, brandStatusNote } from '../brands.js'
import { BRAND_SEO } from '../../seo/config.mjs'

export const UPDATED = '2026-11-16'
export const EMAIL = CTA.email
export const WHATSAPP_NUMBER = CTA.whatsapp.number
export const WHATSAPP_BASE = CTA.whatsapp.link.split('?')[0] // https://wa.me/91XXXXXXXXXX

// On the live site a page flagged `soon` shows "Coming soon". On your own computer (npm run dev) the real page is shown, so you can design it.
export const isSoon = (path) => !import.meta.env?.DEV && Boolean(INFO_PAGES[path]?.soon)

// The site map used by the menu drawer (src/MenuDrawer.jsx) and the footer.
export const NAV = [
  { h: 'Explore', items: [['3D store', '/'], ['Brands', '/brands']] },
  { h: 'For brands', items: [['For brands', '/for-brands'], ['Pricing', '/pricing'], ['Sample report', '/sample-report']] },
  { h: 'Company', items: [['About', '/about'], ['Contact', '/contact'], ['FAQ', '/faq']] },
  { h: 'Legal', items: [['Affiliate disclosure', '/affiliate-disclosure'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Remove or update a listing', '/remove-or-update']] },
]

// the brands on show, with one plain line about each (from the store's own data)
const brandItems = BRANDS.map((b) => {
  const name = b.tabLabel ?? b.name
  const seo = BRAND_SEO[b.id]
  return { name, path: `/${b.id}`, official: seo?.site, p: `${name} makes ${seo?.range ?? 'sneakers'}. ${brandStatusNote(b)}` }
})

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


  '/brands': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'Indian sneaker brands in the 3D store | IndianShoes',
    description: 'The Indian sneaker brands you can walk through in the IndianShoes 3D store: Neemans, Comet, Gully Labs and Bond Street. Open a brand to see its sneakers and prices.',
    h1: 'Indian sneaker brands in the 3D store',
    crumb: 'Brands',
    blocks: [
      { type: 'hero', lead: 'Each brand has its own logo block and bay in the store, with its sneakers on shelves. Open a brand to see its shoes in 3D, or go straight to its official website.', links: [{ label: 'Walk through the 3D store', href: '/', primary: true }] },
      { type: 'brands', h2: 'Brands on display', items: brandItems },
      { type: 'text', h2: 'Want your brand here?', paragraphs: ['If you make sneakers or footwear in India, we can build you a bay of your own.'], list: ['See what is included on the For brands page', 'See the plans on the Pricing page'] },
    ],
  },

  '/pricing': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'Pricing for brands: 3D store plans | IndianShoes',
    description: 'Plans for Indian sneaker brands: a short pilot, a monthly plan and premium placement in the IndianShoes 3D store. Prices are agreed in writing before any work starts.',
    h1: 'Plans for brands',
    crumb: 'Pricing',
    blocks: [
      { type: 'hero', lead: 'We keep it simple: start with a short pilot, then decide. We agree the length, price and what is included in writing before any work starts. No promised sales or lead numbers: we report what happens.', links: [{ label: 'Talk to us on WhatsApp', href: 'whatsapp', primary: true }, { label: 'See a sample report', href: '/sample-report' }] },
      {
        type: 'plans',
        h2: 'Choose how to start',
        items: [
          {
            name: 'Pilot',
            price: 'Quoted per brand',
            note: 'A short trial so you can see it working.',
            list: ['Your own bay in the 3D store', 'Up to 12 shoes as photo cut-outs or 3D models', 'Every shoe gets its own page that search engines and AI assistants can read', 'One report at the end of the pilot'],
          },
          {
            name: 'Monthly',
            price: 'Quoted per brand',
            note: 'For brands that want to stay in the store and keep it fresh.',
            featured: true,
            list: ['Everything in the pilot', 'Your full range, kept up to date', 'A monthly report: what shoppers looked at and clicked, plus search visibility', 'New styles added as you launch them'],
          },
          {
            name: 'Premium placement',
            price: 'Quoted per brand',
            note: 'More space and a spot near the entrance.',
            list: ['Everything in the monthly plan', 'A brand display with your video and a shop button', 'Featured spot on the entrance wall', 'Always labelled "Sponsored" in the store'],
          },
        ],
      },
      {
        type: 'faq',
        h2: 'Pricing questions',
        items: [
          { q: 'What does it cost?', a: 'It depends on how many shoes you have and what you want included. Tell us about your range and we send a written quote. Nothing starts until you agree to it.' },
          { q: 'Do I pay per click or per sale?', a: 'No. Plans are a fixed fee. Shoppers buy on your own website, so we cannot promise sales; we report the clicks we send you.' },
          { q: 'Can I stop after the pilot?', a: 'Yes. The pilot is short on purpose. You decide after you see the report.' },
          { q: 'Is a paid placement marked?', a: 'Yes. Partners and sponsored placements are always labelled in the store.' },
        ],
      },
      { type: 'contact', h2: 'Ask for a quote' },
    ],
  },

  '/sample-report': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'Sample monthly report for brands | IndianShoes',
    description: 'See the kind of monthly report a brand gets from IndianShoes: clicks per shoe, top shoes and search visibility. The numbers on this page are made up, for illustration only.',
    h1: 'What a monthly report looks like',
    crumb: 'Sample report',
    blocks: [
      { type: 'hero', lead: 'This is a SAMPLE. The numbers below are made up to show the layout; they are not real results and not a promise of what your brand will get.', links: [{ label: 'Ask for a quote', href: '/pricing', primary: true }] },
      {
        type: 'table',
        h2: 'Clicks sent to your website (sample)',
        head: ['Shoe', 'Views in the store', 'Clicks to your website'],
        rows: [
          ['Sample shoe A', '412', '38'],
          ['Sample shoe B', '355', '31'],
          ['Sample shoe C', '298', '17'],
          ['Sample shoe D', '241', '12'],
          ['All other shoes', '1,150', '74'],
        ],
        note: 'We record clicks on each Buy button. What happens after the click happens on your website, so we cannot see sales.',
      },
      {
        type: 'cards',
        h2: 'What else is in the report',
        items: [
          { h3: 'Top shoes', p: 'Which styles shoppers open and click most, so you know what to put first.' },
          { h3: 'Where visitors come from', p: 'The websites and searches that bring people to your bay.' },
          { h3: 'Search visibility', p: 'How your shoe pages appear in Google and in AI assistants, and what we changed.' },
        ],
      },
      { type: 'contact', h2: 'Talk to us' },
    ],
  },

  '/about': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'About IndianShoes: a 3D store for Indian sneaker brands',
    description: 'IndianShoes is a 3D virtual sneaker store for Indian brands. We do not sell shoes: every Buy button goes to the brand’s own website. Learn how it works and who it is for.',
    h1: 'About IndianShoes',
    crumb: 'About',
    blocks: [
      { type: 'hero', lead: 'IndianShoes is a 3D virtual sneaker store for Indian brands. You walk through it in your browser, look at shoes in 3D, and go to each brand’s own website to buy.', links: [{ label: 'Walk through the store', href: '/', primary: true }, { label: 'For brands', href: '/for-brands' }] },
      {
        type: 'cards',
        h2: 'What we do',
        items: [
          { h3: 'Show Indian brands in 3D', p: 'Each brand gets a logo block and a bay with its sneakers on shelves. Shoes are 3D models or clean photo cut-outs.' },
          { h3: 'Send shoppers to the brand', p: 'Every Buy button opens the brand’s official website. We do not sell, ship or take payment for shoes.' },
          { h3: 'Make brands easy to find', p: 'Every shoe has its own page that search engines and AI assistants can read, with prices and links.' },
        ],
      },
      {
        type: 'text',
        h2: 'How we work',
        list: [
          'We show a brand’s name, logos and photos to present its products, and change or remove them whenever the brand asks. Brands that have not agreed anything with us are shown as independent listings and are not affiliated with IndianShoes.',
          'Partners and sponsored placements are always labelled.',
          'Prices and shoe lists come from each brand’s website and change over time. Always confirm the current price on the brand’s site.',
          'Some links are affiliate links: we may earn a commission if you buy through them, at no extra cost to you.',
        ],
      },
      { type: 'text', h2: 'Get in touch', paragraphs: [`Questions, corrections or ideas? Email ${EMAIL} or message us on WhatsApp ${WHATSAPP_NUMBER}.`] },
    ],
  },

  '/contact': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'Contact IndianShoes',
    description: 'Contact IndianShoes by WhatsApp or email: ask about a 3D store for your brand, report a wrong price, or ask us to update or remove a listing.',
    h1: 'Contact us',
    crumb: 'Contact',
    blocks: [
      { type: 'hero', lead: 'The fastest way to reach us is WhatsApp. Email works too. We reply as soon as we can.', links: [{ label: 'Message us on WhatsApp', href: 'whatsapp', primary: true }, { label: 'Email us', href: 'email' }] },
      {
        type: 'cards',
        h2: 'Who to contact about what',
        items: [
          { h3: 'A 3D store for your brand', p: 'Tell us about your brand and range. See the Pricing page first if you like.' },
          { h3: 'A wrong price or photo', p: 'Send the shoe’s page and what is wrong. Prices come from brand websites and can change; we will fix it.' },
          { h3: 'Update or remove a listing', p: 'Brand owners can ask us to change or remove anything. Use the Remove or update page.' },
        ],
      },
      { type: 'contact', h2: 'Send us a message' },
    ],
  },

  '/faq': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'IndianShoes FAQ: shoppers and brands',
    description: 'Answers to common questions about IndianShoes: whether it sells shoes, how the 3D store works, affiliate links, prices, and how brands can join.',
    h1: 'Frequently asked questions',
    crumb: 'FAQ',
    blocks: [
      {
        type: 'faq',
        h2: 'For shoppers',
        items: [
          { q: 'Does IndianShoes sell shoes?', a: 'No. IndianShoes is a showcase. Every Buy button opens the brand’s own website, and your purchase is with that brand.' },
          { q: 'How do I use the 3D store?', a: 'Scroll, swipe, drag, or use the bar at the bottom to move between brands. Tap a shoe to see its price and a Buy button.' },
          { q: 'Are the prices up to date?', a: 'Prices come from each brand’s website as of the last update and can change. Always check the price and size on the brand’s website.' },
          { q: 'What are affiliate links?', a: 'Some Buy links are affiliate links: if you buy through them we may earn a commission, at no extra cost to you. See the Affiliate disclosure page.' },
          { q: 'Why is a brand shown as an independent listing?', a: 'It means we have not agreed anything with that brand and are not affiliated with it. Partners and sponsored placements are labelled.' },
          { q: 'Does it work on my phone?', a: 'Yes. It works on phones, tablets and computers. If it does not load on a phone, close other tabs and try again.' },
        ],
      },
      {
        type: 'faq',
        h2: 'For brands',
        items: [
          { q: 'How do I get my brand in the store?', a: 'Message us on WhatsApp or email. We agree a short pilot in writing, you send photos and a product list, and we build your bay.' },
          { q: 'What does it cost?', a: 'See the Pricing page. Prices are quoted per brand and agreed in writing before any work starts.' },
          { q: 'Do you guarantee sales?', a: 'No. We report the clicks we send to your website each month. Sales happen on your own site.' },
          { q: 'Can I have my listing changed or removed?', a: 'Yes, any time. Use the Remove or update page or email us.' },
        ],
      },
      { type: 'contact', h2: 'Still have a question?' },
    ],
  },

  '/affiliate-disclosure': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'Affiliate disclosure | IndianShoes',
    description: 'IndianShoes does not sell shoes. Some Buy links are affiliate links and we may earn a commission at no extra cost to you. Here is how that works and how we label it.',
    h1: 'Affiliate disclosure',
    crumb: 'Affiliate disclosure',
    updated: UPDATED,
    blocks: [
      {
        type: 'text',
        h2: 'The short version',
        paragraphs: ['IndianShoes does not sell shoes. Some links on this site are affiliate links. If you click one and buy, we may earn a commission from the brand. It costs you nothing extra, and it does not change the price you pay.'],
      },
      {
        type: 'text',
        h2: 'How we label things',
        list: [
          'Buy links that may earn us a commission are marked as sponsored links in the page code, as search engines ask.',
          'Brands that are partners, or that pay for placement, are labelled in the store.',
          'Brands that are not partners are shown as independent listings and are not affiliated with IndianShoes.',
          'A brand can be listed without paying us. Being listed is not an endorsement.',
        ],
      },
      {
        type: 'text',
        h2: 'What this does not change',
        list: ['The price you pay on the brand’s website', 'Your purchase, delivery and returns, which are between you and the brand', 'The way we describe or order shoes: we do not rank shoes by commission'],
      },
      { type: 'text', h2: 'Questions', paragraphs: [`Email ${EMAIL} if anything here is unclear.`] },
    ],
  },

  '/remove-or-update': {
    soon: true, // not ready yet: the page shows "Coming soon" and is kept out of search. Remove this line to publish it.
    title: 'Remove or update a listing | IndianShoes',
    description: 'Brand owners: ask IndianShoes to update or remove your brand name, logo, photos or shoe listings. Email or message us and we act promptly.',
    h1: 'Remove or update a listing',
    crumb: 'Remove or update',
    updated: UPDATED,
    blocks: [
      {
        type: 'text',
        h2: 'If you own a brand shown here',
        paragraphs: ['You can ask us to change or remove your brand name, logo, photos, prices or any shoe at any time. You do not need to give a reason.'],
      },
      {
        type: 'steps',
        h2: 'How to ask',
        items: [
          { h3: 'Tell us what to change', p: 'Name the brand and the shoes or images, and say whether you want them updated or removed.' },
          { h3: 'Show you speak for the brand', p: 'Write from your brand’s email address, or message us from the brand’s official WhatsApp number.' },
          { h3: 'We act promptly', p: 'We update or remove it and tell you when it is done. Search engines may take a little longer to drop the old pages.' },
        ],
      },
      { type: 'hero', lead: 'Send your request now.', links: [{ label: 'Email a request', href: 'email', primary: true }, { label: 'Message on WhatsApp', href: 'whatsapp' }] },
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
