import ServerNode from './ServerNode.js'
import {config} from '../config.js'
import {create_append_add_classes} from '../helpers.js'

const div_mods = document.getElementById('servers')
const div_filters = document.getElementById('filters')
const server_nodes = {}


//we will request the server list hre in future
import sample_servers from "./samplejson.js" 

let server_list

const exampleSocket = new WebSocket(config.websocet_api_url, 'version1');
exampleSocket.onmessage = (event) =>{
    if(event.origin != config.websocet_api_url || !event.isTrusted){
        return //filter out all messages from peers
    }
    let data = JSON.parse(event.data)
    //now update display
    for(let server_id in data){
        for(let field_name in data[server_id]){
            console.log(`updating ${server_list[server_id][field_name]} to ${data[server_id][field_name]}`)
            server_list[server_id][field_name] = data[server_id][field_name]
        }
    }
    update_server_nodes(server_nodes)
}

let btn_mods = create_append_add_classes("button",div_filters,[])
btn_mods.textContent = "View Mods"
btn_mods.onclick = ()=>{
    location.href = "index.html"
}
let btn_map = create_append_add_classes("button",div_filters,[])
btn_map.textContent = "Open Map"
btn_map.onclick = ()=>{
    window.open("map.html");
}

async function main(){
    if(config.debug){
        server_list = sample_servers
    }else{
        server_list = await get_server_list(false)
    }
    update_server_nodes(server_nodes)
    render_server_nodes(server_nodes)
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

function update_server_nodes(mod_nodes) {
    for (let server_id in server_list) {
        let server_data = server_list[server_id]

        if(!server_data){
            return
        }
        if (mod_nodes[server_id]) {
            //if a mod node already exists for this mod
            console.log('updating',server_id)
            mod_nodes[server_id].update(server_data)
        } else {
            console.log('creating',server_id)
            let new_mod_node = new ServerNode(server_id, server_data)
            mod_nodes[server_id] = new_mod_node
        }
    }
}

function render_server_nodes(mod_nodes) {
    for (let mod_id in mod_nodes) {
        let mod_node = mod_nodes[mod_id]
        div_mods.appendChild(mod_node.get_html_element())
    }
}

main()