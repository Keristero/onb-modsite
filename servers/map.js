import {config} from '../config.js'

//we will request the server list here in future
import sample_servers from "./samplejson.js" 
import { CSS2DRenderer, CSS2DObject } from '//unpkg.com/three/examples/jsm/renderers/CSS2DRenderer.js';
import { UnrealBloomPass } from '//unpkg.com/three/examples/jsm/postprocessing/UnrealBloomPass.js';

const exampleSocket = new WebSocket(config.websocet_api_url, 'version1');
let server_list


//setup

//load surface reflection cubemap texture
var loader = new THREE.CubeTextureLoader();
loader.setPath( 'assets/images/cubemap/' );
var textureCube = loader.load( [
	'dark-s_px.jpg', 'dark-s_nx.jpg',
	'dark-s_py.jpg', 'dark-s_ny.jpg',
	'dark-s_pz.jpg', 'dark-s_nz.jpg'
] );

//add 2d text renderer
let css2drenderer = new CSS2DRenderer()

//create graph
let onb_map_graph = ForceGraph3D({
    controlType: 'orbit',
    extraRenderers: [css2drenderer]
})
(document.getElementById('3d-graph'))
.linkWidth(1)
.backgroundColor('rgb(2, 4, 27)')
.onNodeHover(node => {
    //console.log(node)
})
.linkDirectionalParticles(2)
.linkDirectionalParticleSpeed(0.001)
.linkDirectionalParticleColor((link)=>link.particle_color)
.linkDirectionalParticleWidth(2)
.nodeThreeObject(create_node_3d_object)

//setup bloom pass
const bloomPass = new UnrealBloomPass();
bloomPass.strength = 1;
bloomPass.radius = 0.5;
bloomPass.threshold = 0.1;
onb_map_graph.postProcessingComposer().addPass(bloomPass);

function create_node_3d_object(node){
    let node_object = new THREE.Object3D();
    let box_geometry = new THREE.BoxGeometry(10+(Math.random()*20), 2, 10+(Math.random()*20))
    // Create an array of materials to be used in a cube, one for each side
    var cubeMaterialArray = [];

    let surface_matarial = new THREE.MeshStandardMaterial( { color: 0x005903,metalness: 1,envMap: textureCube,roughness:0  } )
    let side_matarial = new THREE.MeshBasicMaterial( { color: 0xffb300 } )

    // order to add materials: x+,x-,y+,y-,z+,z-
    cubeMaterialArray.push( side_matarial );
    cubeMaterialArray.push( side_matarial );
    cubeMaterialArray.push( surface_matarial );
    cubeMaterialArray.push( surface_matarial );
    cubeMaterialArray.push( side_matarial );
    cubeMaterialArray.push( side_matarial );

    //const box_mesh = new THREE.MeshBasicMaterial( {color: '#ffb300'} ); 
    const box = new THREE.Mesh( box_geometry, cubeMaterialArray  ); 

    const nodeEl = document.createElement('div');
    nodeEl.textContent = node.label
    nodeEl.style.color = 'white'//node.color;
    nodeEl.className = 'node-label';
    let threeD_text = new CSS2DObject(nodeEl);
    node_object.add(threeD_text)
    node_object.add(box)
    return node_object

}

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
                color:server.color,//server.color,
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

function find_missing_player(player_maps_old,player_maps_new){
    for(let player_id in player_maps_old){
        if(!player_maps_new[player_id]){
            return player_id
        }  
    }
    return null
}

function animate_server_transfer(start_node,end_node){
    console.log("Player transfered servers!",start_node,end_node)
}

async function main(){
    if(config.debug){
        server_list = sample_servers
    }else{
        server_list = await get_server_list(false)
    }

    let whitelisted_fields = ["map","player_maps"]
    let catch_departures = null
    let start_node_id = null
    let catch_arrivals = null
    let end_node_id = null

    //register websocket listener
    exampleSocket.onmessage = (event) =>{
        if(event.origin != config.websocet_api_url || !event.isTrusted){
            return //filter out all messages from peers
        }
        let data = JSON.parse(event.data)
        //now update display
        for(let server_id in data){
            let incoming_server_data = data[server_id]
            if(!server_list[server_id]){
                server_list[server_id] = {}
            }
            let current_data = server_list[server_id]

            //update map
            if(incoming_server_data?.map){
                console.log(`updating ${current_data.map} to ${incoming_server_data.map}`)
                current_data.map = incoming_server_data.map
                update_graph()
            }

            if(incoming_server_data?.player_maps){
                //if there is already a player map, count the keys
                if(current_data.player_maps){
                    let missing_player = find_missing_player(current_data.player_maps,incoming_server_data.player_maps)
                    let new_player = find_missing_player(incoming_server_data.player_maps,current_data.player_maps)
                    //if the player count goes down, a player has disconnected or gone to another server
                    if(missing_player){
                        let start_map_id = current_data.player_maps[missing_player]
                        start_node_id = `${server_id}_${start_map_id}`
                        console.log('player went missing from ',start_map_id)
                        //set up a timeout to catch an arriving player within 500ms
                        if(catch_departures != null && end_node_id){
                            //if we were expecting a player to leave somewhere, we got em
                            animate_server_transfer(start_node_id,end_node_id)
                            catch_departures = null
                        }else{
                            //otherwise set up trigger for arrivals
                            catch_arrivals = setTimeout(()=>{
                                catch_arrivals = null
                            },500)
                        }
                    }
                    if(new_player){
                        let end_map_id = incoming_server_data.player_maps[new_player]
                        end_node_id = `${server_id}_${end_map_id}`
                        console.log('player appeared in  ',end_map_id)
                        //check trigger
                        if(catch_arrivals != null && start_node_id){
                            //if we were expecting a player to arrive somewhere, we got em
                            animate_server_transfer(start_node_id,end_node_id)
                            catch_arrivals = null
                        }else{
                            //otherwise set up trigger for departures
                            catch_departures = setTimeout(()=>{
                                catch_departures = null
                            },500)
                        }
                    }
                }
                current_data.player_maps = incoming_server_data.player_maps
            }
        }
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