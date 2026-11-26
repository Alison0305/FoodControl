from django.contrib import admin

from .models import DetallePedido, Jornada, Pago, Pedido, Producto


class ProductoInline(admin.TabularInline):
    model = Producto
    extra = 0


class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 0


class PagoInline(admin.TabularInline):
    model = Pago
    extra = 0


@admin.register(Jornada)
class JornadaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'fecha', 'estado', 'creado_por')
    list_filter = ('estado', 'fecha')
    search_fields = ('nombre',)
    inlines = [ProductoInline]


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'jornada', 'tipo', 'precio', 'activo')
    list_filter = ('tipo', 'activo', 'jornada')
    search_fields = ('nombre',)


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ('nombre_cliente', 'jornada', 'tipo', 'estado', 'registrado_por')
    list_filter = ('tipo', 'estado', 'jornada')
    search_fields = ('nombre_cliente',)
    inlines = [DetallePedidoInline, PagoInline]


@admin.register(DetallePedido)
class DetallePedidoAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'producto', 'cantidad', 'precio_unitario')
    list_filter = ('pedido__jornada',)


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'monto', 'metodo', 'registrado_por', 'fecha_pago')
    list_filter = ('metodo', 'pedido__jornada')
