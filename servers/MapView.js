
class MapView{
    constructor(all_server_data){
        this.data = all_server_data
        this.hidden = false
        this.create()
    }
    get_html_element(){
        return this.canvas
    }
    create(){
        this.update(this.data)
    }
    update(all_server_data){
        this.data = all_server_data
        if(!this.canvas){
            this.canvas = document.createElement('canvas')
            this.canvas.width = 800
            this.canvas.height = 600
            this.ctx = this.canvas.getContext('2d')
        }
        this.reset_map()
    }
    get_server_id_from_address(server_address){
        for(let id in this.data){
            if(server_address == this.data[id].address){
                return id
            }
        }
        return null
    }
    reset_map(){
        this.nodes = {}
        this.max_repulsion = 20
        this.repel_force_multi = 4
        this.attract_force_multi = 2
        this.min_velocity = 0.05
        for(let server_id in this.data){
            if(this.data[server_id]?.map){
                //if the server provides a map
                for(let map_id in this.data[server_id].map){
                    let map_info = this.data[server_id].map[map_id]
                    let node_props = {
                        name:map_info?.name || map_id,
                        color:this.data[server_id]?.color || "white",
                        connections:[]
                    }
                    for(let c_map_name in map_info.l){
                        node_props.connections.push(`${server_id}_${c_map_name}`)
                    }
                    for(let r_server_address in map_info.r){
                        node_props.connections.push(this.get_server_id_from_address(r_server_address))
                    }
                    this.add_map_node(`${server_id}_${map_id}`,node_props)
                }
            }else{
                //if the server does not provide a map
                let node_props = {
                    name:this.data[server_id]?.name || server_id,
                    color:this.data[server_id]?.color || "white",
                    connections:[]
                }
                this.add_map_node(`${server_id}`,node_props)
            }
        }
        this.ctx.font = "bold 25px BN6";
        console.log('nodes',this.nodes)
    }
    add_map_node(id,props){
        props.x = -0.5+(this.canvas.width/2)+Math.random()
        props.y = -0.5+(this.canvas.height/2)+Math.random()
        props.radius = 10
        this.nodes[id] = props
    }
    draw_circle(node){
        this.ctx.lineWidth = 2
        this.ctx.beginPath();
        this.ctx.fillStyle = node.color
        this.ctx.arc(node.x,node.y,node.radius, 0, 2 * Math.PI,false);
        this.ctx.closePath()
        this.ctx.fill();
        this.ctx.stroke();
    }
    draw_connections(node){
        for(let node_b_id of node.connections){
            if(node_b_id){
                let node_b = this.nodes[node_b_id]
                this.draw_line_between_nodes(node,node_b)
            }
        }
    }
    draw_nametag(node){
        //draw name
        let font_x = node.x
        let font_y = node.y-node.radius-10
        this.ctx.fillStyle = 'black'
        this.ctx.fillText(node.name,font_x+1,font_y+1)
        this.ctx.fillStyle = node.color
        this.ctx.fillText(node.name,font_x,font_y)
    }
    draw_line_between_nodes(node_a,node_b){
        this.ctx.strokeStyle = 'black'
        this.ctx.beginPath(); // Start a new path
        this.ctx.moveTo(node_a.x, node_a.y); // Move the pen to (30, 50)
        this.ctx.lineTo(node_b.x, node_b.y); // Draw a line to (150, 100)
        this.ctx.stroke(); // Render the path
    }
    physics(){
        for(let node_id in this.nodes){
            let node = this.nodes[node_id]
            let vel_x = 0
            let vel_y = 0
            //add repel forces to vel
            for(let other_node_id in this.nodes){
                if(other_node_id != node_id){
                    let other_node = this.nodes[other_node_id]
                    vel_x += 1/(node.x - other_node.x)
                    vel_y += 1/(node.y - other_node.y)
                }
            }
            //add attract force to vel
            for(let node_b_id of node.connections){
                if(node_b_id){
                    let node_b = this.nodes[node_b_id]
                    vel_x -= (node.x - node_b.x)*0.001
                    vel_y -= (node.y - node_b.y)*0.001
                }
            }
            vel_x = Math.max(Math.min(vel_x,this.max_repulsion),-this.max_repulsion)
            vel_y = Math.max(Math.min(vel_y,this.max_repulsion),-this.max_repulsion)
            if(Math.abs(vel_x) < this.min_velocity){
                vel_x = 0
            }
            if(Math.abs(vel_y) < this.min_velocity){
                vel_y = 0
            }

            node.x += vel_x
            node.y += vel_y

        }
    }
    draw(){
        this.physics()
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
        for(let node_id in this.nodes){
            let node = this.nodes[node_id]
            this.draw_connections(node)
        }
        for(let node_id in this.nodes){
            let node = this.nodes[node_id]
            this.draw_circle(node)
        }
        for(let node_id in this.nodes){
            let node = this.nodes[node_id]
            this.draw_nametag(node)
        }
    }
}

export default MapView