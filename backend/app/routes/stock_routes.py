from flask import Blueprint, request, jsonify

stock_bp = Blueprint('stock', __name__)

# Sample stock inventory
inventory = []

@stock_bp.route('/', methods=['GET'])
def get_inventory():
    """Get all stock items"""
    return jsonify({
        'inventory': inventory,
        'count': len(inventory)
    })

@stock_bp.route('/', methods=['POST'])
def add_stock_item():
    """Add a new stock item"""
    data = request.get_json()
    
    if not data or 'name' not in data or 'quantity' not in data:
        return jsonify({'error': 'Missing required fields: name, quantity'}), 400
    
    new_item = {
        'id': len(inventory),
        'name': data['name'],
        'quantity': data['quantity'],
        'price': data.get('price', 0.0),
        'category': data.get('category', 'general'),
        'supplier': data.get('supplier', '')
    }
    
    inventory.append(new_item)
    return jsonify(new_item), 201

@stock_bp.route('/<int:item_id>', methods=['GET'])
def get_stock_item(item_id):
    """Get a specific stock item"""
    if 0 <= item_id < len(inventory):
        return jsonify(inventory[item_id])
    return jsonify({'error': 'Item not found'}), 404

@stock_bp.route('/<int:item_id>/update-quantity', methods=['PATCH'])
def update_quantity(item_id):
    """Update quantity of a stock item"""
    if 0 <= item_id < len(inventory):
        data = request.get_json()
        if 'quantity' in data:
            inventory[item_id]['quantity'] = data['quantity']
            return jsonify(inventory[item_id])
        return jsonify({'error': 'Quantity field required'}), 400
    return jsonify({'error': 'Item not found'}), 404

@stock_bp.route('/low-stock/<int:threshold>', methods=['GET'])
def get_low_stock(threshold):
    """Get items with stock below threshold"""
    low_stock_items = [item for item in inventory if item['quantity'] < threshold]
    return jsonify({
        'items': low_stock_items,
        'count': len(low_stock_items)
    })

@stock_bp.route('/<int:item_id>', methods=['DELETE'])
def delete_stock_item(item_id):
    """Delete a stock item"""
    if 0 <= item_id < len(inventory):
        deleted = inventory.pop(item_id)
        return jsonify({'message': 'Item deleted', 'item': deleted})
    return jsonify({'error': 'Item not found'}), 404
