import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def asignar_identificadores(apps, schema_editor):
    Pago = apps.get_model('core', 'Pago')
    for pago in Pago.objects.filter(identificador_idempotencia__isnull=True).iterator():
        pago.identificador_idempotencia = uuid.uuid4()
        pago.save(update_fields=['identificador_idempotencia'])


class Migration(migrations.Migration):
    dependencies = [('core', '0001_initial')]

    operations = [
        migrations.AddField(model_name='pago', name='estado', field=models.CharField(choices=[('vigente', 'Vigente'), ('anulado', 'Anulado')], default='vigente', max_length=8)),
        migrations.AddField(model_name='pago', name='motivo_anulacion', field=models.TextField(blank=True)),
        migrations.AddField(model_name='pago', name='anulado_por', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='pagos_anulados', to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name='pago', name='fecha_anulacion', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='pago', name='identificador_idempotencia', field=models.UUIDField(editable=False, null=True)),
        migrations.RunPython(asignar_identificadores, migrations.RunPython.noop),
        migrations.AlterField(model_name='pago', name='identificador_idempotencia', field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
    ]
