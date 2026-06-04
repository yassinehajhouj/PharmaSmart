from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'titre',
        'user',
        'type_notification',
        'is_read',
        'created_at'
    ]
    list_filter = ['type_notification', 'is_read', 'created_at']
    search_fields = ['titre', 'message', 'user__username']
    ordering = ['-created_at']
    list_editable = ['is_read']
    readonly_fields = ['created_at', 'read_at']
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        """Action pour marquer plusieurs notifications comme lues."""
        from django.utils import timezone
        queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, f"{queryset.count()} notifications marquées comme lues.")
    mark_as_read.short_description = "Marquer comme lu"
    
    def mark_as_unread(self, request, queryset):
        """Action pour marquer plusieurs notifications comme non lues."""
        queryset.update(is_read=False, read_at=None)
        self.message_user(request, f"{queryset.count()} notifications marquées comme non lues.")
    mark_as_unread.short_description = "Marquer comme non lu"