/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
// const sidebars = {
//   // By default, Docusaurus generates a sidebar from the docs folder structure
//   tutorialSidebar: [{ type: 'autogenerated', dirName: '.' }],
//   "new-tab": [
//     {
//       type: "autogenerated",
//       dirName: "new-tab",
//     },
//   // But you can create a sidebar manually
//   /*
//   tutorialSidebar: [
//     'intro',
//     'hello',
//     {
//       type: 'category',
//       label: 'Tutorial',
//       items: ['tutorial-basics/create-a-document'],
//     },
//   ],
//    */
// };
const sidebars = {
  // key 对应顶部栏，顶部栏会在下面讲到
  Solidity: [{ type: "autogenerated", dirName: 'solidity', }],
  Security: [{ type: "autogenerated", dirName: 'security', }],
  Web3Tools: [{ type: "autogenerated", dirName: 'Web3tools', }],
  CTF: [{ type: "autogenerated", dirName: 'ctf', }],

};

export default sidebars;
