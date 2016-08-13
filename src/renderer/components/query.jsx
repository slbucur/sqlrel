import React, { Component, PropTypes } from 'react';
import { debounce } from 'lodash';
import AceEditor from 'react-ace';
import ace from 'brace';
import 'brace/mode/sql';
import 'brace/mode/javascript';
import 'brace/mode/css';
import 'brace/theme/ambiance';
import 'brace/ext/language_tools';
import 'brace/ext/searchbox';
import QueryResult from './query-result.jsx';
import ServerDBClientInfoModal from './server-db-client-info-modal.jsx';
import GraphContainer from './graph-container.jsx'

import { ResizableBox } from 'react-resizable';
require('./react-resizable.css');


const QUERY_EDITOR_HEIGTH = 200;
const langTools = ace.acequire('ace/ext/language_tools');


const INFOS = {
  mysql: [
    'MySQL treats commented query as a non select query.' +
      'So you may see "affected rows" for a commented query.',
    'Usually executing a single query per tab will give better results.',
  ],
  sqlserver: [
    'MSSQL treats multiple non select queries as a single query result.' +
      'So you affected rows will show the amount over all queries executed in the same tab.',
    'Usually executing a single query per tab will give better results.',
  ],
};


const EVENT_KEYS = {
  onSelectionChange: 'changeSelection',
};


export default class Query extends Component {
  static propTypes = {
    widthOffset: PropTypes.number.isRequired,
    client: PropTypes.string.isRequired,
    query: PropTypes.object.isRequired,
    enabledAutoComplete: PropTypes.bool.isRequired,
    enabledLiveAutoComplete: PropTypes.bool.isRequired,
    databases: PropTypes.array,
    tables: PropTypes.array,
    columnsByTable: PropTypes.object,
    triggersByTable: PropTypes.object,
    views: PropTypes.array,
    functions: PropTypes.array,
    procedures: PropTypes.array,
    onExecQueryClick: PropTypes.func.isRequired,
    onCopyToClipboardClick: PropTypes.func.isRequired,
    onSQLChange: PropTypes.func.isRequired,
    onSelectionChange: PropTypes.func.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.refs.queryBoxTextarea.editor.on(
      EVENT_KEYS.onSelectionChange,
      debounce(::this.onSelectionChange, 100),
    );

    // init with the auto complete disabled
    this.refs.queryBoxTextarea.editor.completers = [];
    this.refs.queryBoxTextarea.editor.setOption('enableBasicAutocompletion', false);

    $('.menu .item').tab();
    $('.menu .item.active').click();
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.enabledAutoComplete) {
      return;
    }

    const isMetadataChanged = (
      ((nextProps.tables || []).length !== (this.props.tables || []).length)
      || ((nextProps.views || []).length !== (this.props.views || []).length)
      || ((nextProps.functions || []).length !== (this.props.functions || []).length)
      || ((nextProps.procedures || []).length !== (this.props.procedures || []).length)
      || (Object.keys(nextProps.columnsByTable || {}).length
          !== Object.keys(this.props.columnsByTable || []).length)
      || (Object.keys(nextProps.triggersByTable || {}).length
          !== Object.keys(this.props.triggersByTable || []).length)
    );

    if (!isMetadataChanged) {
      return;
    }

    const completions = this.getQueryCompletions(nextProps);

    const customCompleter = {
      getCompletions(editor, session, pos, prefix, callback) {
        callback(null, completions);
      },
    };

    // force load only the current available completers
    // discarding any previous existing completers
    this.refs.queryBoxTextarea.editor.completers = [
      langTools.snippetCompleter,
      langTools.textCompleter,
      langTools.keyWordCompleter,
      customCompleter,
    ];

    this.refs.queryBoxTextarea.editor.setOption(
      'enableBasicAutocompletion',
      true
    );

    this.refs.queryBoxTextarea.editor.setOption(
      'enableLiveAutocompletion',
      nextProps.enabledLiveAutoComplete
    );
  }

  componentDidUpdate() {
    if (this.props.query.isExecuting && this.props.query.isDefaultSelect) {
      this.refs.queryBoxTextarea.editor.focus();
      window.scrollTo(0, 0);
    }
  }

  componentWillUnmount() {
    this.refs.queryBoxTextarea.editor.removeListener(
      EVENT_KEYS.onSelectionChange,
      ::this.onSelectionChange,
    );
  }

  onSelectionChange() {
    this.props.onSelectionChange(
      this.props.query.query,
      this.refs.queryBoxTextarea.editor.getCopyText(),
    );
  }

  onExecQueryClick() {
    const query = this.refs.queryBoxTextarea.editor.getCopyText() || this.props.query.query;
    this.props.onExecQueryClick(query);
  }

  onDiscQueryClick() {
    this.props.onSQLChange('');
  }

  onShowInfoClick() {
    this.setState({ infoModalVisible: true });
  }

  onQueryBoxResize() {
    this.refs.queryBoxTextarea.editor.resize();
  }

  onGraphStyleBoxResize(){
    if(this.refs.graphStyleBoxTextarea){
      this.refs.graphStyleBoxTextarea.editor.resize();
    }
  }

  getQueryCompletions(props) {
    const {
      databases,
      tables,
      columnsByTable,
      triggersByTable,
      views,
      functions,
      procedures,
    } = props;

    const mapCompletionTypes = (items, type) => {
      let result = items;
      if (!Array.isArray(items)) {
        result = Object.keys(items || {})
          .reduce((all, name) => all.concat(items[name]), []);
      }

      return (result || []).map(({ name }) => ({ name, type }));
    };

    return [
      ...mapCompletionTypes(databases, 'database'),
      ...mapCompletionTypes(tables, 'table'),
      ...mapCompletionTypes(columnsByTable, 'column'),
      ...mapCompletionTypes(triggersByTable, 'trigger'),
      ...mapCompletionTypes(views, 'view'),
      ...mapCompletionTypes(functions, 'function'),
      ...mapCompletionTypes(procedures, 'procedure'),
    ].map(({ name, type }) => ({ name, value: name, score: 1, meta: type }));
  }

  getCommands () {
    return [
      {
        name: 'increaseFontSize',
        bindKey: 'Ctrl-=|Ctrl-+',
        exec(editor) {
          const size = parseInt(editor.getFontSize(), 10) || 12;
          editor.setFontSize(size + 1);
        },
      },
      {
        name: 'decreaseFontSize',
        bindKey: 'Ctrl+-|Ctrl-_',
        exec(editor) {
          const size = parseInt(editor.getFontSize(), 10) || 12;
          editor.setFontSize(Math.max(size - 1 || 1));
        },
      },
      {
        name: 'resetFontSize',
        bindKey: 'Ctrl+0|Ctrl-Numpad0',
        exec(editor) {
          editor.setFontSize(12);
        },
      },
      {
        name: 'selectCurrentLine',
        bindKey: { win: 'Ctrl-L', mac: 'Command-L' },
        exec(editor) {
          const { row } = editor.selection.getCursor();
          const endColumn = editor.session.getLine(row).length;
          editor.selection.setSelectionRange({
            start: { column: 0, row },
            end: { column: endColumn, row },
          });
        },
      },
    ];
  }

  focus() {
    this.refs.queryBoxTextarea.editor.focus();
  }

  render() {
    const { widthOffset, client, query, onCopyToClipboardClick, onSQLChange, onGraphStyleChange } = this.props;
    const infos = INFOS[client];
    console.log(query);
    return (
      <div>
        <div>
          <div className="ui top attached tabular menu">
            <a className="item active" data-tab="query">Query</a>
            <a className="item" data-tab="graph-style">Graph Style</a>
          </div>
          <div className="ui bottom attached tab segment" data-tab="query">
          <ResizableBox
            className="react-resizable react-resizable-se-resize ui segment"
            height={QUERY_EDITOR_HEIGTH}
            width={500}
            onResize={::this.onQueryBoxResize}>
              <AceEditor
                mode="sql"
                theme="ambiance"
                name="querybox"
                height="100%"
                width="100%"
                ref="queryBoxTextarea"
                value={query.query}
                showPrintMargin={false}
                commands={this.getCommands()}
                editorProps={{ $blockScrolling: Infinity }}
                onChange={debounce(onSQLChange, 50)}
                enableBasicAutocompletion
                enableLiveAutocompletion
              />
          </ResizableBox>
          </div>
          <div className="ui bottom attached tab segment" data-tab="graph-style">
            <ResizableBox
              className="react-resizable react-resizable-se-resize ui segment"
              height={QUERY_EDITOR_HEIGTH}
              width={500}
              onResize={::this.onGraphStyleBoxResize()}>
              <AceEditor
                mode="javascript"
                theme="ambiance"
                name="graphstylebox"
                height="100%"
                width="100%"
                ref="graphStyleBoxTextarea"
                value={query.graphStyle}
                showPrintMargin={false}
                commands={this.getCommands()}
                editorProps={{ $blockScrolling: Infinity }}
                onChange={debounce(onGraphStyleChange, 50)}
                enableBasicAutocompletion
                enableLiveAutocompletion
              />
            </ResizableBox>
          </div>
          <div className="ui secondary menu" style={{ marginTop: 0 }}>
            {infos &&
              <div className="item">
                <span>
                  <button className="ui icon button small"
                    title="Query Infomartions"
                    onClick={::this.onShowInfoClick}>
                    <i className="icon info"></i>
                  </button>
                </span>
              </div>
            }
            <div className="right menu">
              <div className="item">
                <div className="ui buttons">
                  <button
                    className={`ui positive button ${query.isExecuting ? 'loading' : ''}`}
                    onClick={::this.onExecQueryClick}>Execute</button>
                  <div className="or"></div>
                  <button
                    className={`ui button ${query.isExecuting ? 'disabled' : ''}`}
                    onClick={::this.onDiscQueryClick}>Discard</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="ui top attached tabular menu">
          <a className="item active" data-tab="data">Data</a>
          <a className="item" data-tab="graph">Graph</a>
        </div>
        <div className="ui bottom attached tab segment" data-tab="data">
          <QueryResult
            widthOffset={widthOffset}
            heigthOffset={QUERY_EDITOR_HEIGTH}
            onCopyToClipboardClick={onCopyToClipboardClick}
            resultItemsPerPage={query.resultItemsPerPage}
            copied={query.copied}
            query={query.queryHistory[query.queryHistory.length - 1]}
            results={query.results}
            isExecuting={query.isExecuting}
            error={query.error} />
        </div>
        <div className="ui bottom attached tab segment" data-tab="graph">
          <GraphContainer
            height={QUERY_EDITOR_HEIGTH}
            copied={query.copied}
            query={query.queryHistory[query.queryHistory.length - 1]}
            results={query.results}
            isExecuting={query.isExecuting}
          />
        </div>


        {this.state && this.state.infoModalVisible &&
          <ServerDBClientInfoModal
            infos={infos}
            client={client}
            onCloseClick={() => this.setState({ infoModalVisible: false })} />
        }
      </div>
    );
  }
}
