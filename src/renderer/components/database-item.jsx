import React, { Component, PropTypes } from 'react';
import TableSubmenu from './table-submenu.jsx';
import { remote } from 'electron'; // eslint-disable-line import/no-unresolved

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;


export default class DatabaseItem extends Component {
  static propTypes = {
    database: PropTypes.object.isRequired,
    item: PropTypes.object.isRequired,
    dbObjectType: PropTypes.string.isRequired,
    style: PropTypes.object,
    columnsByTable: PropTypes.object,
    triggersByTable: PropTypes.object,
    onSelectItem: PropTypes.func,
    onExecuteDefaultQuery: PropTypes.func,
    onGetSQLScript: PropTypes.func,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {};
    this.contextMenu = null;
  }

  // Context menu is built dinamically on click (if it does not exist), because building
  // menu onComponentDidMount or onComponentWillMount slows table listing when database
  // has a loads of tables, because menu will be created (unnecessarily) for every table shown
  onContextMenu(event) {
    event.preventDefault();

    if (!this.contextMenu) {
      this.buildContextMenu();
    }

    this.contextMenu.popup(event.clientX, event.clientY);
  }

  buildContextMenu() {
    const {
      database,
      item,
      dbObjectType,
      onExecuteDefaultQuery,
      onGetSQLScript,
    } = this.props;

    this.contextMenu = new Menu();
    if (dbObjectType === 'Table' || dbObjectType === 'View') {
      this.contextMenu.append(new MenuItem({
        label: 'Select Rows (with limit)',
        click: onExecuteDefaultQuery.bind(this, database, item),
      }));
    }

    this.contextMenu.append(new MenuItem({ type: 'separator' }));

    this.contextMenu.append(new MenuItem({
      label: 'Create Statement',
      click: onGetSQLScript.bind(this, database, item, 'CREATE', dbObjectType),
    }));

    if (dbObjectType === 'Table') {
      const actionTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
      const labelsByTypes = {
        SELECT: 'Select Statement',
        INSERT: 'Insert Statement',
        UPDATE: 'Update Statement',
        DELETE: 'Delete Statement',
      };

      actionTypes.forEach(actionType => {
        this.contextMenu.append(new MenuItem({
          label: labelsByTypes[actionType],
          click: onGetSQLScript.bind(this, database, item, actionType, dbObjectType),
        }));
      });
    }
  }

  toggleTableCollapse() {
    this.setState({ tableCollapsed: !this.state.tableCollapsed });
  }

  renderSubItems(table) {
    const { columnsByTable, triggersByTable, database } = this.props;

    if (!columnsByTable || !columnsByTable[table]) {
      return null;
    }

    const displayStyle = {};
    if (!this.state.tableCollapsed) {
      displayStyle.display = 'none';
    }

    return (
      <div style={displayStyle}>
        <TableSubmenu
          title="Columns"
          table={table}
          itemsByTable={columnsByTable}
          database={database} />
        <TableSubmenu
          collapsed
          title="Triggers"
          table={table}
          itemsByTable={triggersByTable}
          database={database} />
      </div>
    );
  }

  render() {
    const { database, item, style, onSelectItem, dbObjectType } = this.props;
    const hasChildElements = !!onSelectItem;
    const onSingleClick = hasChildElements
      ? () => { onSelectItem(database, item); this.toggleTableCollapse(); }
      : () => {};

    const collapseCssClass = this.state.tableCollapsed ? 'down' : 'right';
    const collapseIcon = (
      <i
        className={`${collapseCssClass} triangle icon`}
        style={{ float: 'left', margin: '0 0.15em 0 -1em' }}
      ></i>
    );
    const tableIcon = (
      <i className="table icon" style={{ float: 'left', margin: '0 0.3em 0 0' }}></i>
    );

    return (
      <div>
        <span
          style={style}
          className="item"
          onClick={onSingleClick}
          onContextMenu={::this.onContextMenu}>
          {dbObjectType === 'Table' ? collapseIcon : null}
          {dbObjectType === 'Table' ? tableIcon : null}
          {item.name}
        </span>
        {this.renderSubItems(item.name)}
      </div>
    );
  }
}
