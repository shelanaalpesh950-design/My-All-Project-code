/**
 * @file stack.c
 * @brief Implementation of the bounded integer stack.
 */

#include "stack.h"
#include <stdlib.h>

struct stack_t {
    int *data;
    size_t capacity;
    int top_index;   /* -1 means empty */
};

stack_t* stack_create(size_t capacity) {
    if (capacity == 0) {
        return NULL;
    }

    stack_t *self = malloc(sizeof(stack_t));
    if (self == NULL) {
        return NULL;
    }

    self->data = malloc(capacity * sizeof(int));
    if (self->data == NULL) {
        free(self); /* Clean up previously allocated memory */
        return NULL;
    }

    self->capacity = capacity;
    self->top_index = -1;

    return self;
}

void stack_destroy(stack_t **self) {
    // Standard professional guard against double-freeing or NULL pointers
    if (self == NULL || *self == NULL) {
        return;
    }

    free((*self)->data);
    free(*self);
    *self = NULL; /* Prevent dangling pointers in the calling application */
}

stack_status_t stack_push(stack_t *self, int value) {
    if (self == NULL) {
        return STACK_ERROR_NULL;
    }
    
    // Check for overflow safely
    if ((size_t)(self->top_index + 1) >= self->capacity) {
        return STACK_ERROR_FULL;
    }

    self->top_index++;
    self->data[self->top_index] = value;
    return STACK_SUCCESS;
}

stack_status_t stack_pop(stack_t *self, int *out_value) {
    if (self == NULL || out_value == NULL) {
        return STACK_ERROR_NULL;
    }

    if (stack_is_empty(self)) {
        return STACK_ERROR_EMPTY;
    }

    *out_value = self->data[self->top_index];
    self->top_index--;
    return STACK_SUCCESS;
}

bool stack_is_empty(const stack_t *self) {
    return (self == NULL || self->top_index == -1);
}