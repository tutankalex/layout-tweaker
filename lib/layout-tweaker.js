// simple-layout-plugin.js

const { CompositeDisposable } = require('atom');
const GridStack = require("gridstack/dist/gridstack-all.js");



// https://unhexium.net/atom/atom-package-development-tricks-for-linux/
const force_atom_devMode = true; // set true to debug in non-devmode

var Debugger = function (prefixStr) {
  this.debug = {};
  if (atom.devMode || force_atom_devMode) {
    for (var m in console)
      if (typeof console[m] == 'function') // eslint-disable-line no-console
        this.debug[m] = console[m].bind(window.console, prefixStr); // eslint-disable-line no-console
  }
  else {
    for (var m in console) // eslint-disable-line no-redeclare
      if (typeof console[m] == 'function') // eslint-disable-line no-console
        this.debug[m] = function () { };
  }
  return this.debug;
}

var debug = Debugger("My Plugin:");


const Pane = require(process.resourcesPath + '/app.asar/src/pane');
const PaneContainer = require(process.resourcesPath + '/app.asar/src/pane-container');
debug.log(PaneContainer)


class CustomPaneContainer extends PaneContainer {
  constructor(...args) {
    debug.log("construct")
    super(...args);
    // Additional constructor logic if needed
  }

  // Example of overriding a method
  addPane(item) {
    debug.log('Adding a pane:', item);
    // Call the original addPane method
    super.addPane(item);
  }

  // Example of attaching a hook
  destroyItem(item) {
    debug.log('Destroying item:', item);
    // Call the original destroyItem method
    super.destroyItem(item);
  }
}




function setupGridstack(parentElement) {
  // Create a new container element for the grid
  const gridStackElement = document.createElement('div');
  gridStackElement.classList.add('grid-stack');
  parentElement.appendChild(gridStackElement);


  // Create initial Gridstack items (similar to how Ribbons were added)
  // this creates boxes. i can't figure out how to make them bigger than 1x1
  var initialRibbonCount = 0;
  for (let i = 0; i < initialRibbonCount; i++) {
    let item = document.createElement('div');
    item.classList.add('grid-stack-item');
    let content = document.createElement('div');
    content.classList.add('grid-stack-item-content');
    content.style.border = `${Math.random() * 4 + 4}px solid rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
    item.appendChild(content);
    gridStackElement.appendChild(item);
  }

  let grid = GridStack.init({
    float: !true,
    handleClass: 'grid-stack-item-handle',
  }, gridStackElement);

  // Add random widgets for demonstration purposes
  const numToAdd = 4;
  for (let i = 0; i < numToAdd; i++) {
    let handle = document.createElement('div');
    handle.classList.add('grid-stack-item-handle');
    handle.innerHTML = `<div style="background: red;">Handle ${i + 1}</div>`;
    handle.style.backgroundColor = `red`;



    let item = document.createElement('div');
    item.classList.add('grid-stack-item');
    item.innerHTML = `<div class="grid-stack-item-content">Item ${i + 1}</div>`;
    item.style.backgroundColor = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;

    item.appendChild(handle);

    grid.addWidget(item, {
      x: Math.floor(4 + Math.random() * 4),
      y: Math.floor(3 + Math.random() * 4),
      w: 4 + Math.floor(Math.random() * 5),
      h: 5 + Math.floor(Math.random() * 6)
    });
  }

  return grid;
}


class SimpleLayoutPlugin {
  constructor() {
    this.subscriptions = new CompositeDisposable();
  }

  activate(state) {
    debug.log('SimpleLayoutPlugin is now active!');

    // Subscribe to workspace events
    this.subscriptions.add(atom.workspace.onDidAddPane(this.handleNewPane.bind(this)));
    this.subscriptions.add(atom.workspace.onDidDestroyPane(this.handleDestroyPane.bind(this)));

    // Instead of replacing PaneAxis, we'll modify the existing layout
    this.modifyLayout();




    // Replace the existing PaneContainer with the new subclass
    atom.workspace.getCenter().paneContainer.__proto__.constructor = CustomPaneContainer;
    debug.log("hijack done")

    setupGridstack(atom.workspace.getCenter().paneContainer.element);
  }

  deactivate() {
    this.subscriptions.dispose();
    // Restore the original layout if necessary
    this.restoreOriginalLayout();
  }

  handleNewPane(pane) {
    debug.log('New pane added:', pane);



    this.updateLayout();
  }

  handleDestroyPane(pane) {
    debug.log('Pane destroyed:', pane);
    this.updateLayout();
  }

  modifyLayout() {
    // Access the root pane container
    const paneContainer = atom.workspace.getCenter().paneContainer;
    window.x = paneContainer

    // Store the original layout for potential restoration
    this.originalLayout = paneContainer.getRoot();
    debug.log("current layout", this.originalLayout)
    debug.log("pane container", paneContainer)
    debug.log("hijacked pane container", new SimpleCustomLayout(paneContainer))

    // Replace the root with our custom layout
    // paneContainer.setRoot(new SimpleCustomLayout(paneContainer));
  }

  restoreOriginalLayout() {
    if (this.originalLayout) {
      const paneContainer = atom.workspace.getCenter().paneContainer;
      paneContainer.setRoot(this.originalLayout);
    }
  }

  updateLayout() {
    const paneContainer = atom.workspace.getCenter().paneContainer;
    const root = paneContainer.getRoot();
    if (root instanceof SimpleCustomLayout) {
      root.updateLayout();
    }
  }
}

class SimpleCustomLayout {
  constructor(paneContainer) {
    this.paneContainer = paneContainer;
    this.children = [];
  }

  addChild(child, index) {
    if (index == null) {
      this.children.push(child);
    } else {
      this.children.splice(index, 0, child);
    }
    this.updateLayout();
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    this.updateLayout();
  }

  updateLayout() {
    debug.log('Updating layout with', this.children.length, 'children');
    // Implement your custom layout logic here
    // For example, arrange panes in a grid or other custom layout

    // This is a simple example that arranges panes horizontally
    let totalWidth = this.paneContainer.element.clientWidth;
    let paneWidth = totalWidth / Math.max(1, this.children.length);

    this.children.forEach((child, index) => {
      child.setFlexScale(1); // Ensure all panes have equal flex
      child.element.style.width = `${paneWidth}px`;
      child.element.style.left = `${index * paneWidth}px`;
    });
  }

  // Implement other necessary methods here
}

module.exports = new SimpleLayoutPlugin();


debug.log("HELLO")
