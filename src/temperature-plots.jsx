var React = require('react');
var ReactDOM = require('react-dom');
var {XYPlot, XAxis, YAxis, HorizontalGridLines, VerticalGridLines, LineSeries, DiscreteColorLegend} = require('react-vis');

export class TemperaturePlot extends React.PureComponent {
  render() {
     return (
        <XYPlot width={800} height={300} xType="time" yDomain={[0,100]}>
          <HorizontalGridLines/>
          <VerticalGridLines/>
          <XAxis title="Time"/>
          <YAxis title="Temperature"/>
          {this.props.data.map((vals, topic) => <LineSeries key={topic} data={vals.toJS().map(({timestamp, value}) => {return {x: timestamp, y: value};})}/>).toArray()}
         <DiscreteColorLegend items={this.props.data.keySeq().toJS()}/>
        </XYPlot>
      );
  }
}

export class TemperaturePlots extends React.PureComponent {
  render() {
    var plots = this.props.data.get('shown').map((state, building) => <TemperaturePlot key={building} data={state} />);
    return (<div>{plots.toArray()}</div>);
  }
}
