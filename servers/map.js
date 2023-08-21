import {config} from '../config.js'

//we will request the server list here in future
import sample_servers from "./samplejson.js" 


function get_server_id_from_address(server_list,address){
    for(let server_id in server_list){
        if(server_list[server_id]?.address == address){
            return server_id
        }
    }
    return null
}

function get_server_map_with_incoming_data(server,data){
    if(!server?.map){
        return 'default'
    }
    for(let map_id in server.map){
        let map = server.map[map_id]
        if(map?.r){
            for(let other_server_address in map.r){
                let r_con = map.r[other_server_address]
                if(r_con.incoming_data == data){
                    return map_id
                }
            }
        }
    }
    return 'default'
}

function server_list_to_nodes_and_links(server_list){
    console.log(server_list)
    let nodes = []
    let links = []
    let next_node_id = 0
    for(let server_id in server_list){
        let server = server_list[server_id]
        if(!server?.map){
            continue
        }
        for(let map_id in server.map){
            let map = server.map[map_id]
            let label = map.name
            if(!label || label == ""){
                label = map.id
            }
            nodes.push({
                id:`${server_id}_${map_id}`,
                label:label,
                color:server.color
            })
            //local connections
            if(map.l){
                for(let other_map_id in map.l){
                    if(server.map[other_map_id]){
                        links.push({
                            source:`${server_id}_${map_id}`,
                            target:`${server_id}_${other_map_id}`,
                        })
                    }
                }
            }
            //remote connections
            if(map.r){
                for(let other_server_address in map.r){
                    let other_server_id = get_server_id_from_address(server_list,other_server_address)
                    if(!other_server_id){
                        continue
                    }
                    let other_server = server_list[other_server_id]
                    let data =  map.r[other_server_address].data
                    let other_map_id = get_server_map_with_incoming_data(other_server,data)
                    if(!other_map_id){
                        return
                    }
                    links.push({
                        source:`${server_id}_${map_id}`,
                        target:`${other_server_id}_${other_map_id}`,
                    })
                }
            }
        }
    }

    return {nodes,links}
}

async function main(){
    let server_list
    if(config.debug){
        server_list = sample_servers
    }else{
        server_list = await get_server_list(false)
    }

    const {nodes,links} = server_list_to_nodes_and_links(server_list)

    // Random tree
    const N = 300;
    const gData = {
      nodes: nodes,
      links: links
    };

    const Graph = ForceGraph3D()
      (document.getElementById('3d-graph'))
        .graphData(gData)
        .nodeAutoColorBy('group')
        .nodeThreeObject(node => {
          const sprite = new SpriteText(node.label);
          sprite.material.depthWrite = false; // make sprite background transparent
          sprite.color = node.color;
          sprite.textHeight = 10;
          sprite.fontFace = "courier new"
          sprite.fontWeight = "bold"
          return sprite;
        });

    // Spread nodes a little wider
    Graph.d3Force('charge').strength(-50);
}

function get_server_list(get_test_list_instead) {
    return new Promise(async(resolve, reject) => {
        if(get_test_list_instead){
            resolve(sample_servers)
        }else{
            const request = new Request(`${config.api_url}/server_list/`, {
                method: 'GET'
            });
            fetch(request).then(response => response.json())
            .then(data => {
                resolve(data)
            })
        }
    })
}

main()