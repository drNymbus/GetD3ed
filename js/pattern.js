function computeMapBack(nodes) {
    let links = [], idLink = 0;

    for (var i = 0; i < nodes.length; i++) {
        let node1 = nodes[i];
        for (var j = i+1; j < nodes.length; j++) {
            let node2 = nodes[j];

            if (node2.time - node1.time == 1) {
                let nLabel = commonLabels(node1, node2);
                if (nLabel.length > 0) {
                    links.push({
	                    "id"     : idLink,
                        "source" : node1.id,
                        "target" : node2.id,
                        "value"  : nLabel.length,
                        "label"  : nLabel.join(',')
                    });
                }
                idLink++;
            }
        }
    }
    return links;
}

//given 2 nodes or links, return a list of labels that n1 and n2 have in common
function commonLabels(n1, n2) {
    let labels = [];
    for (var i = 0; i < n1.label.length; i++) {
        let l1 = n1.label[i];
        for (var j = 0; j < n2.label.length; j++) {
            let l2 = n2.label[j];
            if (l1 === l2) {labels.push(l1);}
        }
    }
    return labels;
}

function sameTrajectory(l1,l2) {
  var s1 = false, s2 = false;

  s1 = l1.target.toString() + l1.source.toString();
  s2 = l2.target.toString() + l2.source.toString();

  if (s1 == s2) return true;
  return false;
}

function layoutPattern(nodes, patterns) {
    patterns.forEach(function(p) {
        p.links.forEach(function(l) {
            //node.total is the number of links coming or going out of the node
            node = nodes[l.source];
            node.total = (typeof node.total === "undefined") ? 1 : node.total + 1;

            node = nodes[l.target];
            node.total = (typeof node.total === "undefined") ? 1 : node.total + 1;
        });
    });
    nodes.forEach(function(n) {
        //useful to positionning all links at the start
        n.i_source = 1;
        n.i_target = 1;
    });
}

function pathIntersection(graph, link) {
    var curvature = .5;
    var source = graph.nodes[link.source];
    var target = graph.nodes[link.target];

	var x0 = source.x + source.dx,
		x1 = target.x,
		xi = d3.interpolateNumber(x0, x1),
		x2 = xi(curvature),
		x3 = xi(1 - curvature),
		y0 = source.y + source.dy / 2,
		y1 = target.y + target.dy / 2;

    return "M" + x0 + "," + y0
         + "C" + x2 + "," + y0
         + " " + x3 + "," + y1
         + " " + x1 + "," + y1;
}

function pathPattern(graph, link) {
	var curvature = .5;
	var source = graph.nodes[link.source];
	var target = graph.nodes[link.target];
    var s_step = (typeof link.i_source === "number") ? link.i_source : source.i_source;
    var t_step = (typeof link.i_target === "number") ? link.i_target : target.i_target;

	var x0 = source.x + source.dx,
		x1 = target.x,
		xi = d3.interpolateNumber(x0, x1),
		x2 = xi(curvature),
		x3 = xi(1 - curvature),
		y0 = source.y + ((source.dy - 40) / source.total * s_step + 20),
		y1 = target.y + ((target.dy - 40) / target.total * t_step + 20);

    //affect i_source and i_target, so no need to recompute those value during dragmove
    if (typeof link.i_source === "undefined") link.i_source = source.i_source;
    if (typeof link.i_target === "undefined") link.i_target = target.i_target;

    source.i_source += 1;
    target.i_target += 1;

	return "M" + x0 + "," + y0
         + "C" + x2 + "," + y0
         + " " + x3 + "," + y1
         + " " + x1 + "," + y1;
}

function formatLink(l){
    return l.target.toString() + l.source.toString() + l.label.toString();
}

//returns true if the link 'x' is in the list, false if not.
function occurence(list, x) {
    for (var i = 0; i < list.length; i++) {
        if (formatLink(list[i]) == formatLink(x)) {
            return true;
        }
    }
    return false;
}

//deletes all useless duplicate links contained in original .json file
function deleteDuplicate(pattern) {
    new_links = [pattern.links[0]];

    for (var i = 1; i < pattern.links.length; i++) {
        var link = pattern.links[i];
        if (!occurence(new_links, link)) {
            new_links.push(link);
        }
    }
    pattern.links = new_links;
    return pattern;
}

//from 2 patterns compute a list of all links containing the same trajectory and labels.
function computeIntersection(pattern1, pattern2) {
//remove contains all id, contributing in creating the intersection list
  var intersection = [], remove = [];
  pattern1.links.forEach(function(l1) {
    pattern2.links.forEach(function(l2) {

      if (formatLink(l1) == formatLink(l2)) {
        remove.push(l1.id); remove.push(l2.id);
        intersection.push(l1);
      } else {
        l1.label = (typeof l1.label == "string") ? l1.label.split(',') : l1.label;
        l2.label = (typeof l2.label == "string") ? l2.label.split(',') : l2.label;

        var labels = commonLabels(l1,l2);
        if (sameTrajectory(l1, l2) && labels.length > 0) {
          remove.push(l1.id); remove.push(l2.id);
          intersection.push({
            "id"    : 0,
            "source": l1.source,
            "target": l1.target,
            "label" : ((labels.length > 1) ? labels.join(',') : labels[0]),
            "value" : labels.length
          });

        }
      }

    });
  });

  //merge links.label of every links with the same trajectory
  intersection.forEach(function(l,j) {
    for (var i = j+1; i < intersection.length; i++) {
        if (sameTrajectory(intersection[i], l)) {
            (typeof l.label === "Array") ?
                l.label.push(intersection[i].label) : l.label = [l.label, intersection[i].label];
            intersection.splice(i, 1);
            break;
        }
    }
  });
  var remove_s = new Set(remove);
  return [intersection, remove_s];
}

function drawInfoBox(d, position) {
  var infoBox = document.getElementById("tooltip");
  var tmp = "";
  tmp += '<rect x="0" y="0" width="140" height="30" fill="grey" fill-opacity="0.1" rx="5" ry="5" />';
  tmp += '<text x="5" y="20" fill="back">'+("Object(s): " + d.label.toString())+'</text>';
  infoBox.setAttribute("transform","translate("+(position[0].toString())+" "+(position[1].toString())+")");
  infoBox.innerHTML = tmp;
}

function removeInfoBox() {
  var infoBox = document.getElementById("tooltip");
  infoBox.innerHTML = "";
}
