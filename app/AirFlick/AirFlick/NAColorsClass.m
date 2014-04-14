//
//  NAColorsClass.m
//  airflick
//
//  Created by Nathan Teetor on 4/13/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NAColorsClass.h"
#define UIColorFromRGB(rgbValue) [UIColor \
colorWithRed:((float)((rgbValue & 0xFF0000) >> 16))/255.0 \
green:((float)((rgbValue & 0xFF00) >> 8))/255.0 \
blue:((float)(rgbValue & 0xFF))/255.0 alpha:1.0]

@implementation NAColorsClass

@synthesize color1;
@synthesize color2;
@synthesize color3;

static NAColorsClass *instance = nil;

+(NAColorsClass *)getInstance {
    @synchronized(self){
        if (instance == nil){
            instance = [NAColorsClass new];
            instance.color1 = @"#FFFF00";
            instance.color2 = @"#FF00FF";
            instance.color3 = @"#00FFFF";
        }
    }
    return instance;
}

-(UIColor *)getColor {
    if (instance == nil){
        [NSException raise:@"NAColorsClass not instantiated" format:@"instantiate obj before calling getColor"];
    }
    
    NSUInteger i = arc4random_uniform(3);
    UIColor *color = nil;
    NSUInteger red, green, blue;
    NSString *stringColor;
    
    if (i == 0){
        stringColor = instance.color1;
    } else if (i == 1){
        stringColor = instance.color2;
    } else if (i == 2) {
        stringColor = instance.color3;
    }
    
    sscanf([stringColor UTF8String], "#%02X%02X%02X", &red, &green, &blue);
    color = [UIColor colorWithRed:red/255.0 green:green/255.0 blue:blue/255.0 alpha:1];
    
    return color;
}

@end
