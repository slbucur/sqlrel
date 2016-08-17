import path from 'path';
import { cloneDeep, trim } from 'lodash';
import csvStringify from 'csv-stringify';
import { clipboard } from 'electron'; // eslint-disable-line import/no-unresolved
import { getCurrentDBConn, getDBConnByName } from './connections';
import { rowsValuesToString } from '../utils/convert';
import { showSaveDialog, saveFile, showOpenDialog, openFile, showOpenDirectoryDialog } from '../utils/file-handler';
import wait from '../utils/wait';


export const NEW_QUERY = 'NEW_QUERY';
export const SELECT_QUERY = 'SELECT_QUERY';
export const REMOVE_QUERY = 'REMOVE_QUERY';
export const EXECUTE_QUERY_REQUEST = 'EXECUTE_QUERY_REQUEST';
export const EXECUTE_QUERY_SUCCESS = 'EXECUTE_QUERY_SUCCESS';
export const EXECUTE_QUERY_FAILURE = 'EXECUTE_QUERY_FAILURE';
export const COPY_QUERY_RESULT_TO_CLIPBOARD_REQUEST = 'COPY_QUERY_RESULT_TO_CLIPBOARD_REQUEST';
export const COPY_QUERY_RESULT_TO_CLIPBOARD_SUCCESS = 'COPY_QUERY_RESULT_TO_CLIPBOARD_SUCCESS';
export const COPY_QUERY_RESULT_TO_CLIPBOARD_FAILURE = 'COPY_QUERY_RESULT_TO_CLIPBOARD_FAILURE';
export const SAVE_QUERY_REQUEST = 'SAVE_QUERY_REQUEST';
export const SAVE_QUERY_SUCCESS = 'SAVE_QUERY_SUCCESS';
export const SAVE_QUERY_FAILURE = 'SAVE_QUERY_FAILURE';

export const SAVE_GRAPH_STYLE_REQUEST = 'SAVE_GRAPH_STYLE_REQUEST';
export const SAVE_GRAPH_STYLE_SUCCESS = 'SAVE_GRAPH_STYLE_SUCCESS';
export const SAVE_GRAPH_STYLE_FAILURE = 'SAVE_GRAPH_STYLE_FAILURE';

export const SAVE_PNG_REQUEST = 'SAVE_PNG_REQUEST';
export const SAVE_PNG_SUCCESS = 'SAVE_PNG_SUCCESS';
export const SAVE_PNG_FAILURE = 'SAVE_PNG_FAILURE';

export const UPDATE_QUERY = 'UPDATE_QUERY';
export const UPDATE_GRAPH_STYLE = 'UPDATE_GRAPH_STYLE';
export const IMPORT_QUERY_REQUEST = 'IMPORT_QUERY_REQUEST';
export const IMPORT_QUERY_SUCCESS = 'IMPORT_QUERY_SUCCESS';
export const IMPORT_QUERY_FAILURE = 'IMPORT_QUERY_FAILURE';

export const IMPORT_GHAPH_STYLE_REQUEST = 'IMPORT_GHAPH_STYLE_REQUEST';
export const IMPORT_GRAPH_STYLE_SUCCESS = 'IMPORT_GRAPH_STYLE_SUCCESS';
export const IMPORT_GRAPH_STYLE_FAILURE = 'IMPORT_GRAPH_STYLE_FAILURE';

export const SAVE_JPHP_REQUEST = 'SAVE_JPHP_REQUEST';
export const SAVE_JPHP_SUCCESS = 'SAVE_JPHP_SUCCESS';
export const SAVE_JPHP_FAILURE = 'SAVE_JPHP_FAILURE';


export function newQuery (database) {
  return { type: NEW_QUERY, database };
}


export function selectQuery (id) {
  return { type: SELECT_QUERY, id };
}


export function removeQuery (id) {
  return { type: REMOVE_QUERY, id };
}


export function executeQueryIfNeeded (query) {
  return (dispatch, getState) => {
    if (shouldExecuteQuery(query, getState())) {
      dispatch(executeQuery(query));
    }
  };
}


export function executeDefaultSelectQueryIfNeeded (database, table) {
  return async (dispatch, getState) => {
    const currentState = getState();
    const dbConn = getDBConnByName(database);
    const queryDefaultSelect = await dbConn.getQuerySelectTop(table);

    if (!shouldExecuteQuery(queryDefaultSelect, currentState)) {
      return;
    }

    if (needNewQuery(currentState, database, queryDefaultSelect)) {
      dispatch({ type: NEW_QUERY, database });
    }

    dispatch({ type: UPDATE_QUERY, query: queryDefaultSelect });
    dispatch(executeQuery(queryDefaultSelect, true, dbConn));
  };
}

export function updateGraphStyle (graphStyle) {
  return (dispatch) => {
    dispatch({ type: UPDATE_GRAPH_STYLE, graphStyle })
  };
}

export function updateQueryIfNeeded (query, selectedQuery) {
  return (dispatch, getState) => {
    if (shouldUpdateQuery(query, selectedQuery, getState())) {
      dispatch(updateQuery(query, selectedQuery));
    }
  };
}



function updateQuery (query, selectedQuery) {
  return { type: UPDATE_QUERY, query, selectedQuery };
}

function shouldUpdateQuery (query, selectedQuery, state) {
  const currentQuery = getCurrentQuery(state);
  if (!currentQuery) return true;
  if (currentQuery.isExecuting) return false;
  if (query === currentQuery.query
      && (selectedQuery !== undefined && selectedQuery === currentQuery.selectedQuery)) {
    return false;
  }

  return true;
}

export function appendQuery (query) {
  return (dispatch, getState) => {
    const currentQuery = getCurrentQuery(getState()).query;
    const newLine = !currentQuery ? '' : '\n';
    const appendedQuery = `${currentQuery}${newLine}${query}`;
    if (!currentQuery.isExecuting) {
      dispatch(updateQuery(appendedQuery));
    }
  };
}


export function copyToClipboard (rows, type) {
  return async dispatch => {
    dispatch({ type: COPY_QUERY_RESULT_TO_CLIPBOARD_REQUEST });
    try {
      let value;
      if (type === 'CSV') {
        value = await stringifyResultToCSV(rows);
      } else {
        // force the next dispatch be separately
        // handled of the previous one
        await wait(0);
        value = JSON.stringify(rows, null, 2);
      }
      clipboard.writeText(value);
      dispatch({ type: COPY_QUERY_RESULT_TO_CLIPBOARD_SUCCESS });
    } catch (error) {
      dispatch({ type: COPY_QUERY_RESULT_TO_CLIPBOARD_FAILURE, error });
    }
  };
}


export function saveQuery () {
  return async (dispatch, getState) => {
    dispatch({ type: SAVE_QUERY_REQUEST });
    try {
      const currentQuery = getCurrentQuery(getState());
      const filters = [
        { name: 'SQL', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] },
      ];

      let filename = (currentQuery.filename || await showSaveDialog(filters));
      if (path.extname(filename) !== '.sql') {
        filename += '.sql';
      }

      await saveFile(filename, currentQuery.query);
      const name = path.basename(filename, '.sql');

      dispatch({ type: SAVE_QUERY_SUCCESS, name, filename });
    } catch (error) {
      dispatch({ type: SAVE_QUERY_FAILURE, error });
    }
  };
}

export function saveGraphStyle () {
  return async (dispatch, getState) => {
    dispatch({ type: SAVE_GRAPH_STYLE_REQUEST });
    try {
      const currentQuery = getCurrentQuery(getState());
      const filters = [
        { name: 'CSS', extensions: ['css'] },
        { name: 'All Files', extensions: ['*'] },
      ];

      let graphStyleFilename = (currentQuery.graphStyleFilename || await showSaveDialog(filters));
      if (path.extname(graphStyleFilename) !== '.css') {
        graphStyleFilename += '.css';
      }

      await saveFile(graphStyleFilename, currentQuery.graphStyle);

      dispatch({ type: SAVE_GRAPH_STYLE_SUCCESS, graphStyleFilename });
    } catch (error) {
      dispatch({ type: SAVE_GRAPH_STYLE_FAILURE, error });
    }
  };
}

export function importQuery () {
  return async (dispatch, getState) => {
    dispatch({ type: IMPORT_QUERY_REQUEST });
    try {
      const currentQuery = getCurrentQuery(getState());
      const filters = [
        { name: 'SQL', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] },
      ];

      let filename = await showOpenDialog(filters);
      const name = path.basename(filename[0], '.sql');

      let query = await openFile(filename[0]);

      dispatch({ type: IMPORT_QUERY_SUCCESS, name, filename:filename[0] , query});
    } catch (error) {
      dispatch({ type: IMPORT_QUERY_FAILURE, error });
    }
  };
}

export function importGraphStyle () {
  return async (dispatch, getState) => {
    dispatch({ type: IMPORT_GHAPH_STYLE_REQUEST });
    try {
      const currentQuery = getCurrentQuery(getState());
      const filters = [
        { name: 'CSS', extensions: ['css'] },
        { name: 'All Files', extensions: ['*'] },
      ];

      let filename = await showOpenDialog(filters);
      const name = path.basename(filename[0], '.css');

      let graphStyle = await openFile(filename[0]);

      dispatch({ type: IMPORT_GRAPH_STYLE_SUCCESS, graphStyleFilename:filename[0] , graphStyle});
    } catch (error) {
      dispatch({ type: IMPORT_GRAPH_STYLE_FAILURE, error });
    }
  };
}

export function savePNG (base64) {
  return async (dispatch, getState) => {
    dispatch({ type: SAVE_PNG_REQUEST });
    try {
      const currentQuery = getCurrentQuery(getState());
      const filters = [
        { name: 'PNG', extensions: ['png'] },
        { name: 'All Files', extensions: ['*'] },
      ];

      base64 = base64.replace(/^data:image\/png;base64,/, "");
      let pngFilename = await showSaveDialog(filters);

      await saveFile(pngFilename, base64, 'base64');

      dispatch({ type: SAVE_PNG_SUCCESS });
    } catch (error) {
      dispatch({ type: SAVE_PNG_FAILURE, error });
    }
  };
}

export function saveJPHP (base64) {
  return async (dispatch, getState) => {
    dispatch({ type: SAVE_JPHP_REQUEST });
    try {
      const currentQuery = getCurrentQuery(getState());
      console.log(currentQuery);

      let directory = await showOpenDirectoryDialog();
      directory = directory[0];
      let phpFilename = path.join(directory, 'GraphModule.php'),
        htmFilename = path.join(directory, 'GraphModule.htm'),
        cssFilename = path.join(directory, 'css', 'relations.css'),
        jsFilename = path.join(directory, 'js', 'relations.js'),
        cytoFilename = path.join(directory, 'js', 'cytoscape.js');


      let html = require('raw!./templates/jphp_project/GraphModule.html'),
        php = require('raw!./templates/jphp_project/GraphModule.php'),
        relationCss = require('raw!./templates/jphp_project/css/relations.css'),
        relationJs = require('raw!./templates/jphp_project/js/relations.txt'),
        cytoscape = require('raw!./templates/jphp_project/js/cytoscape.txt');

      php = php.replace('{query}', currentQuery.query);
      html = html.replace('{graph-style}', currentQuery.graphStyle);

      await saveFile(phpFilename, php);
      await saveFile(htmFilename, html);

      await saveFile(cssFilename, relationCss);
      await saveFile(jsFilename, relationJs);
      await saveFile(cytoFilename, cytoscape);

      dispatch({ type: SAVE_JPHP_SUCCESS });
    } catch (error) {
      dispatch({ type: SAVE_JPHP_FAILURE, error });
    }
  };
}




function shouldExecuteQuery (query, state) {
  const currentQuery = getCurrentQuery(state);
  if (!currentQuery) return true;
  if (currentQuery.isExecuting) return false;
  return true;
}


function executeQuery (query, isDefaultSelect = false, dbConnection) {
  return async (dispatch, getState) => {
    dispatch({ type: EXECUTE_QUERY_REQUEST, query, isDefaultSelect });
    try {
      const dbConn = dbConnection || getCurrentDBConn(getState());
      const remoteResult = await dbConn.executeQuery(query);

      // Remove any "reference" to the remote IPC object
      const results = cloneDeep(remoteResult);

      dispatch({ type: EXECUTE_QUERY_SUCCESS, query, results });
    } catch (error) {
      dispatch({ type: EXECUTE_QUERY_FAILURE, query, error });
    }
  };
}


function stringifyResultToCSV(rows) {
  if (!rows.length) {
    return '';
  }

  const header = Object.keys(rows[0]).reduce((_header, col) => {
    _header[col] = col; // eslint-disable-line no-param-reassign
    return _header;
  }, {});

  const data = [
    header,
    ...rowsValuesToString(rows),
  ];

  return new Promise((resolve, reject) => {
    csvStringify(data, (err, csv) => {
      if (err) {
        reject(err);
      } else {
        resolve(csv);
      }
    });
  });
}


function getCurrentQuery(state) {
  return state.queries.queriesById[state.queries.currentQueryId];
}

function needNewQuery(currentState, database, queryDefaultSelect) {
  const currentQuery = getCurrentQuery(currentState);
  if (!currentQuery) {
    return false;
  }

  const queryIsDifferentDB = currentQuery.database !== database;
  const queryIsNotDefault = currentQuery.query !== queryDefaultSelect;
  const queryIsNotEmpty = !!trim(currentQuery.query);

  return queryIsDifferentDB || (queryIsNotDefault && queryIsNotEmpty);
}
