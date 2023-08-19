import ServerNode from './ServerNode.js'
import {config} from '../config.js'

const div_mods = document.getElementById('servers')
const div_filters = document.getElementById('filters')
const server_nodes = {}

//we will request the server list here in future
import sample_servers from "./samplejson.js" 

async function main(){
    let server_list
    if(config.debug){
        server_list = sample_servers
    }else{
        server_list = await get_server_list(false)
    }
    console.log(server_list)
    update_server_nodes(server_list, server_nodes)
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

function update_server_nodes(mod_list, mod_nodes) {
    for (let server_id in mod_list) {
        let server_data = mod_list[server_id]

        if (mod_nodes[server_id]) {
            //if a mod node already exists for this mod
            mod_nodes[server_id].update()
        } else {
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