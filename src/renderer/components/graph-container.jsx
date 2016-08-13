import React,{Component} from 'react';
import cytoscape from 'cytoscape';
require('./graph-container.css');

const DEFAULT_STYLE = `
node{
  height: 80;
  width: 80;
  background-fit: cover;
  border-color: #000;
  border-width: 3;
  border-opacity: 0.5;
  content: data(name);
  text-valign: center;
}
edge{
  width: 6;
  target-arrow-shape: triangle;
  line-color: #ffaaaa;
  target-arrow-color: #ffaaaa;
  curve-style: bezier;        
}`;

export default class GraphContainer extends React.Component{



  constructor(props, context) {
    super(props, context);
    this.state = {
      selectedNodeData: {}
    };
  }

  getCyElements(){

    var rows = this.props.results[0].rows;

    function rowToRel(row){
      //if no relation don't add
      if(!row['node1'] || !row['node2']){
        return [];
      }
      var rel = { data: { source: row['node1'], target: row['node2'] } };
      var nodes = [
        { data: { id: row['node1'] } },
        { data: { id: row['node2'] } },
      ];
      for(var key in row){
        if(key.includes('1')){
          var itemKey = key.replace('1', '');
          nodes[0]['data'][itemKey] = row[key];
          continue;
        }
        if(key.includes('2')){
          var itemKey = key.replace('2', '');
          nodes[1]['data'][itemKey] = row[key];
          continue;
        }
        //properties that don't belong to nodes go to the relationship
        rel.data[key] = row[key];
      }
      return [nodes[0], nodes[1], rel];
    }
    return rows.map(rowToRel).reduce((prev, curr) => prev.concat(curr), []);
  }

  renderCytoscapeElement(){
    var elements;
    if(this.props.results){
      elements = this.getCyElements()
    }
    else{
      elements = {
        nodes: [
          { data: { id: 'test1' } },
          { data: { id: 'test2' } },
        ],
          edges: [
        { data: { source: 'test1', target: 'test2' } },
      ]
      }
    }

    var style = this.props.graphStyle || DEFAULT_STYLE;


    console.log('* Cytoscape.js is rendering the graph..', elements);

    this.cy = cytoscape(
      {
        container: document.getElementById('cy'),

        boxSelectionEnabled: false,
        autounselectify: true,

        style: style,
        elements: elements,

        layout: {
          name: 'cose',
          directed: true,
          padding: 10
        }
      });

    this.cy.on('tap', 'node', (e) =>{
      var node = e.cyTarget,
        data = node._private.data;
      this.setState({
        selectedNodeData: data
      })
    });

    this.cy.on('tap', 'edge', (e) =>{
      var node = e.cyTarget,
        data = node._private.data;
      this.setState({
        selectedNodeData: data
      })
    });
  }

  componentDidUpdate(){
    if(this.updateCy){
      this.cy.destroy();
      this.renderCytoscapeElement();
    }
    this.updateCy = false;
  }

  componentDidMount(){
    this.renderCytoscapeElement();
  }

  shouldCyUpdate(nextProps){
    return (!nextProps.isExecuting && this.props.isExecuting) ||
      (nextProps.query !== this.props.query) ||
      (nextProps.copied && !this.props.copied);
  }
  shouldComponentUpdate(nextProps) {
    if(this.shouldCyUpdate(nextProps)){
      this.updateCy = true;
      return true;
    }

    if(Object.keys(this.state.selectedNodeData).length !== 0){
      this.updateCy = false;
      return true;
    }
    return false;
  }

  savePNG(){
    if(!this.cy){
      return;
    }
    let base64 = this.cy.png({scale: 5});
    this.props.savePNG(base64);
  }

  render(){
    return(
      <div className="cy-container">
        <div className="box options">
          <button
            className="ui button blue mini"
            onClick={::this.savePNG}>PNG</button>
        </div>
        <div className="box info">
          <h5> Info </h5>
          <div className="content">
            {Object.keys(this.state.selectedNodeData).map((key) => {
              var value = this.state.selectedNodeData[key];
              return (<div> <b>{key} :</b> <span> {value} </span></div>);
            })
            }
          </div>

        </div>
        <div id="cy" style={{height: this.props.height * 2}}>

        </div>
      </div>
    )
  }
}
