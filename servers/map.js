import {config} from '../config.js'

//we will request the server list here in future
import sample_servers from "./samplejson.js" 

const exampleSocket = new WebSocket(config.websocet_api_url, 'version1');
let server_list
let onb_map_graph = ForceGraph3D()
    (document.getElementById('3d-graph'))
    .linkWidth(0.5)
    .nodeThreeObject(node => {
        const sprite = new SpriteText(node.label);
        sprite.material.depthWrite = false; // make sprite background transparent
        sprite.color = node.color;
        sprite.textHeight = 10;
        sprite.fontFace = "courier new"
        sprite.fontWeight = "bold"
        return sprite;})
    .onNodeHover(node => {
        console.log(node)
    })
    .linkDirectionalParticles(2)
    .linkDirectionalParticleSpeed(0.001)
    .linkDirectionalParticleColor((link)=>link.particle_color)
    .linkDirectionalParticleWidth(2)


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
            let new_node = {
                id:`${server_id}_${map_id}`,
                label:label,
                color:server.color,
                links:[]
            }
            nodes.push(new_node)
            //local connections
            if(map.l){
                for(let other_map_id in map.l){
                    if(server.map[other_map_id]){
                        let neighbour_id = `${server_id}_${other_map_id}`
                        new_node.links.push(neighbour_id)
                        let new_link = {
                            source:new_node.id,
                            target:neighbour_id,
                            particle_color:new_node.color
                        }
                        links.push(new_link)
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
                    let neighbour_id = `${other_server_id}_${other_map_id}`
                    new_node.links.push(neighbour_id)
                    let new_link = {
                        source:new_node.id,
                        target:neighbour_id,
                        particle_color:new_node.color
                    }
                    links.push(new_link)
                }
            }
        }
    }

    return {nodes,links}
}

function update_graph(){
    if(!onb_map_graph){
        return
    }
    let {nodes,links} = server_list_to_nodes_and_links(server_list)
    onb_map_graph.graphData({nodes,links});
}

async function main(){
    if(config.debug){
        server_list = sample_servers
    }else{
        server_list = await get_server_list(false)
    }

    //register websocket listener
    exampleSocket.onmessage = (event) =>{
        if(event.origin != config.websocet_api_url || !event.isTrusted){
            return //filter out all messages from peers
        }
        let data = JSON.parse(event.data)
        //now update display
        for(let server_id in data){
            for(let field_name in data[server_id]){
                if(field_name != "map"){
                    continue // we only need to update the graph when the map changes
                }
                console.log(`updating ${server_list[server_id][field_name]} to ${data[server_id][field_name]}`)
                server_list[server_id][field_name] = data[server_id][field_name]
            }
        }
        update_graph()
    }

    update_graph()

    // Spread nodes a little wider
    onb_map_graph.d3Force('charge').strength(-50);
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