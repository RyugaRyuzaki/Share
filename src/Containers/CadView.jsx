import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { makeStyles } from '@mui/styles';
import SearchIndex from './SearchIndex.js';
import MenuButton from '../Components/MenuButton';
import ItemPanel from '../Components/ItemPanel';
import AboutPanel from '../Components/AboutPanel';
import NavPanel from '../Components/NavPanel';
import SearchBar from '../Components/SearchBar';
import ToolBar from '../Components/ToolBar';
import gtag from '../utils/gtag.js';
import SnackBarMessage from '../Components/SnackbarMessage';
import { computeElementPath, setupLookupAndParentLinks } from '../utils/TreeUtils';
import { Color } from 'three';


const debug = 0;
const PANEL_TOP = 84;

const useStyles = makeStyles((theme) => ({
  menuToolbarContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px',
    '@media (max-width: 900px)': {
      marginTop: '40px',
    },
  },
  searchContainer: {
    position: 'absolute',
    top: `${PANEL_TOP}px`,
    left: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  viewContainer: {
    position: 'absolute',
    top: '0px',
    left: '0px',
    textAlign: 'center',
    color: 'blue',
    width: '100vw',
    height: '100vh',
    margin: 'auto',
  },
  itemPanelToggleButton: {
    position: 'absolute',
    top: `${PANEL_TOP}px`,
    right: '20px',
  },
  aboutPanelContainer: {
    position: 'absolute',
    top: `${PANEL_TOP}px`,
    left: 0,
    right: 0,
    minWidth: '200px',
    maxWidth: '500px',
    width: '100%',
    margin: '0em auto',
    border: 'none',
    zIndex:1000,
  },
}));

const CadView = () => {
  const classes = useStyles();
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [viewer, setViewer] = useState({});
  const [rootElement, setRootElement] = useState({});
  const elementsById = useState({});
  const [selectedElement, setSelectedElement] = useState({});
  const [selectedElements, setSelectedElements] = useState([]);
  const [defaultExpandedElements, setDefaultExpandedElements] = useState([]);
  const [expandedElements, setExpandedElements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState();
  const onClickShare = () => setShowShare(!showShare);
  const [searchIndex, setSearchIndex] = useState({ clearIndex: () => {} });
  const [showAbout, setShowAbout] = useState(true)

  const clearSearch = () => {
    setSelectedElements([]);
    viewer.IFC.unpickIfcItems();
  };

  const selectItems = async (resultIDs) => {
    setIsLoading(true);
    setLoadingMessage('Selection in progress');
    setSelectedElements(resultIDs.map((id) => id + ''));
    try {
      if (debug >= 2) {
        console.log('picking ifc items: ', resultIDs);
      }
      setIsLoading(true);
      await viewer.pickIfcItemsByID(0, resultIDs);
      setIsLoading(false);
    } catch (e) {
      // IFCjs will throw a big stack trace if there is not a visual
      // element, e.g. for IfcSite, but we still want to proceed to
      // setup its properties.
      if (debug >= 3) {
        console.error('TODO: no visual element for item ids: ', resultIDs);
      }
    }
  };

  const onSearch = (query) => {
    clearSearch();
    if (debug) {
      console.log(`CadView#onSearch: query: ${query}`);
    }
    query = query.trim();
    if (query === '') {
      return;
    }

    const resultIDs = searchIndex.search(query);
    selectItems(resultIDs);
    gtag('event', 'search', {
      search_term: query,
    });
    setIsLoading(false);
  };

  // TODO(pablo): search suggest
  const onSearchModify = (target) => {};

  const onElementSelect = async (elt) => {
    const id = elt.expressID;
    if (id === undefined) {
      throw new Error('Selected element is missing Express ID');
    }
    selectItems([id]);
    const props = await viewer.getProperties(0, elt.expressID);
    setSelectedElement(props);
    setShowItemPanel(true);
  };

  const onModelLoad = (rootElt, viewer) => {
    setRootElement(rootElt);
    setupLookupAndParentLinks(rootElt, elementsById);
    if (debug >= 2) {
      console.log(
        `CadView#fileOpen: json: '${JSON.stringify(rootElt, null, '  ')}'`
      );
    }
    const expanded = [rootElt.expressID + ''];
    let elt = rootElt;
    for (let i = 0; i < 3; i++) {
      if (elt.children.length > 0) {
        expanded.push(elt.expressID + '');
        elt = elt.children[0];
      }
    }
    setDefaultExpandedElements(expanded);
    setShowNavPanel(true);
    searchIndex.clearIndex();
    const index = new SearchIndex(rootElt, viewer);
    index.indexElement(rootElt);
    // TODO(pablo): why can't i do:
    //   setSearchIndex(new SearchIndex(rootElt, viewer));
    //   searchIndex.indexElement(...);
    // When I try this searchIndex is actually a promise.
    setSearchIndex(index);
    setShowSearchBar(true);
  };
  const navigate = useNavigate();

  // Similar to componentDidMount and componentDidUpdate:
  useEffect(() => {
    const container = document.getElementById('viewer-container');
    const viewer = new IfcViewerAPI({
      container,
      backgroundColor: new Color('#E0E0E0'),
    });
    setViewer(viewer);
    if (debug) {
      console.log('CadView#useEffect: viewer created: ', viewer);
    }
    // No setWasmPath here. As of 1.0.14, the default is
    // http://localhost:3000/static/js/web-ifc.wasm, so just putting
    // the binary there in our public directory.
    viewer.IFC.setWasmPath('./static/js/');
    viewer.addAxes();
    viewer.addGrid(50, 50);
    viewer.clipper.active = true;

    const handleKeyDown = (event) => {
      //add a plane
      if (event.code === 'KeyQ') {
        viewer.clipper.createPlane();
      }
      //delete all planes
      if (event.code === 'KeyW') {
        viewer.clipper.deletePlane();
      }
      if (event.code == 'KeyA') {
        viewer.IFC.unpickIfcItems();
      }
    };

    // Highlight items when hovering over them
    window.onmousemove = viewer.IFC.prePickIfcItem;
    window.onkeydown = handleKeyDown;

    // Select items
    window.ondblclick = async () => {
      const item = await viewer.IFC.pickIfcItem(true);
      if (item.modelID === undefined || item.id === undefined) return;
      const path = computeElementPath(elementsById[item.id], elt => elt.expressID);
      navigate(path);
      setSelectedElement(item);
    };

    // Expanded version of viewer.loadIfcUrl('/index.ifc').  Using
    // this to get access to progress and error.
    const parts = window.location.pathname.split(/[-\w\d]+.ifc/);
    const filePath = './haus.ifc';
    if (debug) {
      console.log('CadView#useEffect: load from server and hash: ', filePath);
    }
    viewer.IFC.loader.load(
      filePath,
      (model) => {
        if (debug) {
          console.log('CadView#useEffect$onLoad, model: ', model, viewer);
        }
        viewer.IFC.addIfcModel(model);
        const rootEltPromise = model.ifcManager.getSpatialStructure(0, true);
        rootEltPromise.then((rootElt) => {
          onModelLoad(rootElt, viewer);
        });
      },
      (progressEvent) => {
        if (debug) {
          console.log('CadView#useEffect$onProgress', progressEvent);
        }
      },
      (error) => {
        console.error('CadView#useEffect$onError', error);
      }
    );
  }, []);

  const loadIfc = async (file) => {
    setIsLoading(true);
    setLoadingMessage('model is loading');
    await viewer.loadIfc(file, true);

    const rootElt = await viewer.IFC.getSpatialStructure(0, true);
    if (debug) {
      console.log('rootElt: ', rootElt);
    }
    onModelLoad(rootElt, viewer);
    gtag('event', 'select_content', {
      content_type: 'ifc_model',
      item_id: file,
    });
    setIsLoading(false);
  };

  const fileOpen = () => {
    const viewerContainer = document.getElementById('viewer-container');
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.classList.add('file-input');
    fileInput.addEventListener(
      'change',
      (event) => loadIfc(event.target.files[0]),
      false
    );

    viewerContainer.appendChild(fileInput);
    fileInput.click();
  };
  const onClickAbout = () => {
    console.log('about is clicked')
  };

  let isLoaded = Object.keys(rootElement).length === 0;
  let isItemSelected = Object.keys(selectedElement).length === 0;
    console.log('isItemSelected', isItemSelected)

  return (
    <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}>
      <div style={{ zIndex: 0 }}>
        <div className={classes.viewContainer} id='viewer-container'></div>
      </div>
      <div style={{ zIndex: 100 }}>
        <ToolBar fileOpen={fileOpen} onClickShare={onClickShare} onClickAbout = {()=>setShowAbout(!showAbout)} />
        <SnackBarMessage
          message={loadingMessage}
          open={isLoading}
          type={'info'}
        />
        <div className={classes.searchContainer}>
          {showSearchBar && (
            <SearchBar
              onSearch={onSearch}
              onSearchModify={onSearchModify}
              onClickMenu={() => setShowNavPanel(!showNavPanel)}
              disabled={isLoaded}
              open={showNavPanel}
            />
          )}
        </div>
        <div className={classes.itemPanelToggleButton}>
          <MenuButton onClick={() => setShowItemPanel(!showItemPanel)} />
        </div>
        <div className={classes.menuToolbarContainer}>
          {showNavPanel &&
            <NavPanel
              viewer={viewer}
              element={rootElement}
              selectedElements={selectedElements}
              defaultExpandedElements={defaultExpandedElements}
              expandedElements={expandedElements}
              onElementSelect={onElementSelect}
              setExpandedElements={setExpandedElements}
            />}
        </div>
        <div>{showItemPanel && <ItemPanel viewer={viewer} element={selectedElement} />}</div>
        <div className={classes.aboutPanelContainer}>
          {showAbout && <AboutPanel close = {()=>setShowAbout(false)} />}
        </div>
      </div>
    </div>
  );
};

export default CadView;
