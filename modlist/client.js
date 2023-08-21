import {create_mod_node} from './mod_classes.js'
import {ModsFilter,ModsSorter,detail_filters,sort_options,search_aliases} from './filter.js'
import {create_append_add_classes} from '../helpers.js'
import {downloadZip} from '../libs/client-zip.js'
import {hide_detail_view} from './detail_view.js'
import {config} from '../config.js'

const div_mods = document.getElementById('mods')
const div_filters = document.getElementById('filters')
const mod_nodes = {}
let selection_changed_timeout;
//filter_fields is defined in filter.js
let filter = new ModsFilter()
let sorter = new ModsSorter()
let user_has_been_warned_about_skin_installs = false

div_filters.appendChild(filter.get_html_element())
filter.filter_changed_callback = (filter_id,filter_value)=>{
    filter_mod_list(filter_id,filter_value)
}
div_filters.appendChild(sorter.get_html_element())
sorter.selection_changed_callback = (sorter_id)=>{
    sort_mod_list(sorter_id)
}

//hide detail view by default, and if you click anywhere
hide_detail_view()
document.body.addEventListener('click',(e)=>{
    hide_detail_view()
})

//create select all button
let btn_select_all = document.createElement('button')
btn_select_all.textContent = "Select All"
btn_select_all.onclick = async()=>{
    //select all non hidden mods
    for(let mod_id in mod_nodes){
        let mod_node = mod_nodes[mod_id]
        if(!mod_node.hidden){
            mod_node.set_selection(true)
        }
    }
}
div_filters.appendChild(btn_select_all)

//create deselect all button
let btn_clear_selection = document.createElement('button')
btn_clear_selection.textContent = "Clear Selection"
btn_clear_selection.onclick = async()=>{
    //select all non hidden mods
    for(let mod_id in mod_nodes){
        let mod_node = mod_nodes[mod_id]
        if(!mod_node.hidden){
            mod_node.set_selection(false)
        }
    }
}
btn_clear_selection.style.display = "none"
div_filters.appendChild(btn_clear_selection)

//create download button
let btn_download_selected = document.createElement('button')
btn_download_selected.textContent = "Download Selected"
btn_download_selected.onclick = async()=>{
    btn_download_selected.textContent = "Preparing Download..."
    btn_download_selected.disabled = true
    await download_selected_mods()
    btn_download_selected.disabled = false
    modnode_selection_changed_callback()
}
btn_download_selected.style.display = "none"
div_filters.appendChild(btn_download_selected)

let btn_servers = create_append_add_classes("button",div_filters,[])
btn_servers.textContent = "View Servers"
btn_servers.onclick = ()=>{
    location.href = "servers.html"
}
let btn_map = create_append_add_classes("button",div_filters,[])
btn_map.textContent = "Open Map"
btn_map.onclick = ()=>{
    window.open("map.html");
}

let mod_list = await get_mod_list()
update_mod_nodes(mod_list, mod_nodes)
render_mod_nodes(mod_nodes)
filter_mod_list('any',"")
sort_mod_list("timestamp")

function list_selected_mods() {
    let selected_mod_nodes = []
    for(let mod_id in mod_nodes){
        let mod_node = mod_nodes[mod_id]
        if(mod_node.selected){
            selected_mod_nodes.push(mod_node)
        }
    }
    return selected_mod_nodes
}

async function download_selected_mods() {
    let selected_mod_nodes = list_selected_mods()
    if(selected_mod_nodes.length == 0){
        return
    }
    let initial_selection_size = selected_mod_nodes.length
    // define what we want in the ZIP
    let zip_entries = []
    for(let mod_node of selected_mod_nodes){
        if(mod_node.data.data.type == "skins"){
            if(!user_has_been_warned_about_skin_installs){
                window.alert('You have selected a user interface skin to download, you will need to extract the skin to install it.')
                user_has_been_warned_about_skin_installs = true
                break
            }
        }
    }
    for(let mod_node of selected_mod_nodes){
        let remote_url = `${config.api_url}/mods/${mod_node.data.attachment_data.attachment_id}.zip`
        let response = await fetch(new Request(remote_url))
        let zip_entry = { name: `${mod_node.data.data.type}/${mod_node.id}.zip`, lastModified: new Date(), input:response }
        zip_entries.push(zip_entry)
        btn_download_selected.textContent = `Downloading (${zip_entries.length}/${initial_selection_size})`
    }
  
    // get the ZIP stream in a Blob
    const blob = await downloadZip(zip_entries).blob()
  
    // make and click a temporary link to download the Blob
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "mods.zip"
    link.click()
    link.remove()
  
    // in real life, don't forget to revoke your Blob URLs if you use them
}

function sort_mod_list(sorter_id){
    let sorter = sort_options[sorter_id]
    let mod_node_keys = Object.keys(mod_nodes)
    let sort_func = function(a,b){
        let mod_a = mod_nodes[a]
        let mod_b = mod_nodes[b]
        return mod_b.details[sorter.sort_detail] - mod_a.details[sorter.sort_detail]
    }
    mod_node_keys.sort(sort_func)
    let i = 1
    for(let key of mod_node_keys){
        let mod_node = mod_nodes[key]
        mod_node.element.style.order = i
        i++
    }
}

function filter_mod_list(filter_id,filter_value){
    let filter_data = detail_filters[filter_id]
    //if no filter value is provided, search for wildcard
    filter_value = filter_value.toLowerCase()
    if(filter_value == ""){
        filter_value = "."
    }
    for(let alias_array of search_aliases){
        if(alias_array.includes(filter_value)){
            filter_value = alias_array.join("|")
            console.log("repalced filter with",filter_value)
        }
    }
    let filterRegexp = new RegExp(filter_value,'gi')
    //make a list of all the detail keys to filter against
    let filter_ids = [filter_id]
    //check if each mod should be hidden by comparing the filter_value to the details
    let matches = 0
    for(let mod_id in mod_nodes){
        let mod_node = mod_nodes[mod_id]
        let node_should_be_hidden = true
        for(let filter_id of filter_ids){
            if(!should_node_be_hidden(mod_node,filter_id,filterRegexp)){
                node_should_be_hidden = false
                break
            }
        }
        mod_node.set_hidden(node_should_be_hidden)
        if(!node_should_be_hidden){
            matches++
        }
    }
    //update filter title
    filter.p_name.textContent = `Filter (${matches}) results`
}

function should_node_be_hidden(mod_node,filter_id,regexp){
    let key_value = mod_node.details[filter_id]
    let should_hide = true
    if(key_value == undefined){
        should_hide = true
    }else if(Array.isArray(key_value)){
        for(let value of key_value){
            if(value.match(regexp)){
                should_hide = false
                break;
            }
        }
    }else if(key_value.match(regexp)){
        should_hide = false
    }
    return should_hide
}

function get_mod_list() {
    return new Promise(async(resolve, reject) => {
        const request = new Request(`${config.api_url}/mod_list/`, {
            method: 'GET'
        });
        fetch(request).then(response => response.json())
        .then(data => {
            resolve(data)
        })
    })
}

function modnode_selection_changed_callback(){
    //recaucluate the list after a short delay, if we call this multiple times in quick succession it will still only run once 
    clearTimeout(selection_changed_timeout)
    selection_changed_timeout = setTimeout(()=>{
        let selected_mods = list_selected_mods()
        if(selected_mods.length == 0){
            btn_clear_selection.style.display = "none"
            btn_download_selected.style.display = "none"
        }else{
            btn_download_selected.innerText = `Download ${selected_mods.length} selected mods`
            btn_download_selected.style.display = "block"
            btn_clear_selection.style.display = "block"
        }
    },10)
}

function update_mod_nodes(mod_list, mod_nodes) {
    for (let mod_id in mod_list) {
        let mod_data = mod_list[mod_id]

        if (mod_nodes[mod_id]) {
            //if a mod node already exists for this mod
            mod_nodes[mod_id].update()
        } else {
            let new_mod_node = create_mod_node(mod_id, mod_data)
            mod_nodes[mod_id] = new_mod_node
        }
        mod_nodes[mod_id].selection_changed_callback = modnode_selection_changed_callback
    }
}

function render_mod_nodes(mod_nodes) {
    for (let mod_id in mod_nodes) {
        let mod_node = mod_nodes[mod_id]
        div_mods.appendChild(mod_node.get_html_element())
    }
}